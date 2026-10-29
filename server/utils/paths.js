const path = require('path');
const fs = require('fs');

// Where the app keeps its files on this computer.
// - In development: inside the server folder.
// - In the desktop app: DATA_DIR is set to the user's AppData folder,
//   e.g. C:\Users\Ada\AppData\Roaming\Universe POS
function dataDir() {
  return process.env.DATA_DIR || path.join(__dirname, '..');
}

// Makes a folder and any missing parent folders.
// (Node 16, used by the desktop app, can freeze with
// fs.mkdirSync(..., { recursive: true }) when a folder cannot be made -
// e.g. the USB drive is unplugged - so we make them one at a time.)
function makeFolder(folder) {
  const missing = [];
  let current = path.resolve(folder);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      const error = new Error(`The drive ${current} was not found.`);
      error.code = 'ENOENT';
      throw error;
    }
    missing.unshift(current);
    current = parent;
  }
  for (const part of missing) fs.mkdirSync(part);
}

// The default folder for backups (the owner can choose another one,
// such as a USB drive, on the Backup page).
function defaultBackupDir() {
  return path.join(dataDir(), 'backups');
}

module.exports = { dataDir, makeFolder, defaultBackupDir };
