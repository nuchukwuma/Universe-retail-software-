const path = require('path');
const { openStore, closeStore } = require('../db');
const { dataDir } = require('../utils/paths');

// The shop's data is kept in files on this computer, in the "data" folder
// of the app's folder:
// - development: server/data
// - desktop app: C:\Users\<name>\AppData\Roaming\Universe POS\data
// No database program needs to be installed or running.
function databaseFolder() {
  return path.join(dataDir(), 'data');
}

// Opens the shop's data (and makes the folder the first time).
async function connectDB() {
  const folder = databaseFolder();
  openStore(folder);
  console.log(`Shop data opened: ${folder}`);
}

// Closes the data files (when the app or the server stops).
async function disconnectDB() {
  closeStore();
}

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.databaseFolder = databaseFolder;
