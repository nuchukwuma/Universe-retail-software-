// The app's keyboard shortcuts. The menu bar itself stays hidden, so it
// never gets in the way of the till's F1-F10 keys - only these work:
//   Ctrl+R reload, F11 full screen, Ctrl +/- zoom, Ctrl+Q quit,
//   Ctrl+Shift+D open data folder, Ctrl+Shift+I developer tools.
const { Menu } = require('electron');

// Builds the (hidden) menu. "actions" holds the app's own menu actions.
function buildMenu(actions) {
  return Menu.buildFromTemplate([
    {
      label: 'App',
      submenu: [
        { role: 'reload', label: 'Reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'togglefullscreen', label: 'Full screen', accelerator: 'F11' },
        { type: 'separator' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { label: 'Open data folder', accelerator: 'CmdOrCtrl+Shift+D', click: actions.openDataFolder },
        { role: 'toggleDevTools', label: 'Developer tools', accelerator: 'CmdOrCtrl+Shift+I' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Universe POS', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
  ]);
}

module.exports = { buildMenu };
