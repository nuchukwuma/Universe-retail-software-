// Gives the app's screens a small, safe set of desktop powers as
// "window.desktop" (see client/src/utils/desktop.js).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  // Print the receipt on the screen: { paper, heightMm, printerName }
  print: (options) => ipcRenderer.invoke('print', options),
  // List the printers installed on this computer
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  // Open a "choose folder" window; answers with the folder or ''
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  // Open a folder in Windows Explorer
  openFolder: (folder) => ipcRenderer.invoke('open-folder', folder),
  // Try to start again after an error (used by error.html)
  retryStart: () => ipcRenderer.invoke('retry-start'),
  // App version, data folder and log folder (used by error.html)
  appInfo: () => ipcRenderer.invoke('app-info'),
});
