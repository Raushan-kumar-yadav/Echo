import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let pyProcess: ChildProcess | null = null
let detectedPort: number | null = null
let appQuitting  = false
let pyKilledByUs = false

function sendPort(port: number) {
  detectedPort = port
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('backend:port', port)
  }
}

function startPython(): void {
  // app.getAppPath() = E:\Echo\ui (contains package.json)
  // .venv and backend/ are one level up at E:\Echo
  const projectRoot = app.isPackaged
    ? process.resourcesPath
    : path.resolve(app.getAppPath(), '..')
  const venvPython = path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
  const pythonExe  = fs.existsSync(venvPython) ? venvPython : 'python'

  pyProcess = spawn(pythonExe, ['-m', 'backend.main'], {
    cwd: projectRoot,
    stdio: 'pipe',
    env: {
      ...process.env,
      PYTHONPATH: projectRoot + (process.env.PYTHONPATH ? ';' + process.env.PYTHONPATH : ''),
      OPENBLAS_NUM_THREADS: '1',
      OMP_NUM_THREADS:      '1',
      MKL_NUM_THREADS:      '1',
    },
  })

  pyProcess.stdout?.on('data', (d: Buffer) => {
    const line = d.toString().trim()
    console.log('[PY]', line)
    const m = line.match(/starting on port (\d+)/)
    if (m) sendPort(parseInt(m[1], 10))
    // uvicorn logs "Uvicorn running on http://127.0.0.1:PORT"
    const m2 = line.match(/127\.0\.0\.1:(\d+)/)
    if (m2 && !detectedPort) sendPort(parseInt(m2[1], 10))
  })

  pyProcess.stderr?.on('data', (d: Buffer) => {
    const msg = d.toString().trim()
    // uvicorn also logs to stderr
    const m2 = msg.match(/127\.0\.0\.1:(\d+)/)
    if (m2 && !detectedPort) sendPort(parseInt(m2[1], 10))
    if (!msg.includes('Watching for file changes') && !msg.includes('WARNING') && !msg.includes('UserWarning')) {
      console.error('[PY ERR]', msg)
    }
  })

  pyProcess.on('close', (code: number | null) => {
    const wasIntentional = pyKilledByUs || appQuitting
    console.log('[PY] exited — code:', code, '| intentional:', wasIntentional)
    pyKilledByUs = false
    detectedPort = null
    if (!wasIntentional && code !== 0) {
      console.log('[PY] crashed — restarting in 2s…')
      setTimeout(startPython, 2000)
    }
  })

  console.log('[PY] started — pid:', pyProcess.pid, '| python:', pythonExe)
}

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    backgroundColor: '#0d0d0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Re-send port if already known when page (re)loads
  mainWindow.webContents.on('did-finish-load', () => {
    if (detectedPort !== null) {
      mainWindow?.webContents.send('backend:port', detectedPort)
      console.log('[Electron] (re-)sent backend:port', detectedPort, 'after did-finish-load')
    }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// ── IPC: Window controls ──
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

// ── IPC: Backend port ──
ipcMain.handle('backend:get-port', () => detectedPort)

// ── IPC: Native render engine (no-op stubs — no C++ addon yet) ──
ipcMain.on('render:seek', () => {})
ipcMain.on('render:play', () => {})
ipcMain.on('render:pause', () => {})
ipcMain.on('render:set-preview-scale', () => {})
ipcMain.handle('render:get-buffer', () => null)
ipcMain.handle('render:get-stats', () => null)
ipcMain.handle('render:is-native', () => false)

// ── IPC: Export (no native engine — use Python fallback) ──
ipcMain.on('export:start', () => {
  mainWindow?.webContents.send('export:progress', {
    frame: 0, total: 0, done: true,
    error: 'Native render engine not loaded — use Python export fallback'
  })
})
ipcMain.on('export:cancel', () => {})

// ── IPC: File dialogs ──
ipcMain.handle('dialog:save', async (_event, opts) => {
  const result = await dialog.showSaveDialog(mainWindow!, opts ?? {})
  return result.canceled ? undefined : result.filePath
})

ipcMain.handle('dialog:open', async (_event, opts) => {
  const result = await dialog.showOpenDialog(mainWindow!, opts ?? {})
  return result.canceled ? undefined : result.filePaths[0]
})

ipcMain.handle('dialog:openFolder', async (_event, options) => {
  const result = await dialog.showOpenDialog(options);
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return undefined;
})

ipcMain.handle('app:get-path', (_event, name: string) => {
  try {
    return app.getPath(name as any)
  } catch {
    return null
  }
})

// ── IPC: WebComp (stubs — no offscreen windows yet) ──
ipcMain.handle('webcomp:create', () => false)
ipcMain.handle('webcomp:capture-frame', () => null)
ipcMain.handle('webcomp:prefetch', () => false)
ipcMain.on('webcomp:update-params', () => {})
ipcMain.on('webcomp:reload', () => {})
ipcMain.on('webcomp:destroy', () => {})
ipcMain.handle('webcomp:push-to-native', () => false)

// ── App lifecycle ──
app.whenReady().then(() => {
  createWindow()
  startPython()
})

app.on('window-all-closed', () => {
  appQuitting  = true
  pyKilledByUs = true
  pyProcess?.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  appQuitting  = true
  pyKilledByUs = true
  pyProcess?.kill()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
