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



  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};


// open os file picker 

ipcMain.handle('dialog:openFolder',async (event , options) => {

  const result = await dialog.showOpenDialog(options);

  if(!result.canceled && result.filePaths.length > 0){
    return result.filePaths[0];
  }

  return undefined;
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  startPython()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
