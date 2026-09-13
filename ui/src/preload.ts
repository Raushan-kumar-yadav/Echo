import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options: any) =>
    ipcRenderer.invoke('dialog:openFolder', options),

  // Backend port — injected by main process once Python is up
  onBackendPort: (cb: (port: number) => void) =>
    ipcRenderer.on('backend:port', (_e, port) => cb(port)),
})