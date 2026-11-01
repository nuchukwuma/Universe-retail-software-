// Holds the one open data store the whole app uses.
const { Store } = require('./store');

let store = null;

// Opens the shop's data in "folder" (made if missing).
function openStore(folder, options) {
  if (store) store.close();
  store = new Store(folder, options);
  store.openFolder();
  return store;
}

// The open store. Throws if the data has not been opened yet.
function getStore() {
  if (!store) throw new Error('The shop\'s data is not open yet.');
  return store;
}

// Closes the data files (when the app stops).
function closeStore() {
  if (store) store.close();
  store = null;
}

module.exports = { openStore, getStore, closeStore };
