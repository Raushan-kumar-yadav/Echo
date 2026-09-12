// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


import { contextBridge, ContextBridge , ipcRenderer } from "electron";


contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options: any) => 
    ipcRenderer.invoke('dialog:openFolder', options)
})