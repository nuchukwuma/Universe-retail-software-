// The desktop app (Electron, see desktop/preload.js) adds "window.desktop"
// with a few extra powers a web browser does not have:
//   desktop.print(options)    - print straight to a printer, no print window
//   desktop.getPrinters()     - list the printers on this computer
//   desktop.chooseFolder()    - open a "choose folder" window
//   desktop.openFolder(path)  - open a folder in Windows Explorer
// When the app runs in a normal browser (development), it is not there,
// and the app falls back to the browser's own print window.
export const desktop = typeof window !== 'undefined' ? window.desktop || null : null;

export const isDesktopApp = Boolean(desktop);
