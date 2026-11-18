// Before version 2 the app was called "Universe POS" and kept the shop's
// data in AppData\Roaming\Universe POS. The first time HordeDesk starts
// on such a laptop, it copies that folder into its own data folder, so the
// shop carries on with all its products, sales, pictures and settings.
// The old folder is left as it was (nothing is deleted).
const fs = require('fs');
const path = require('path');

const OLD_FOLDER_NAMES = ['Universe POS', 'universe-pos'];
const SKIP = new Set(['logs', 'Cache', 'Code Cache', 'GPUCache', 'blob_storage', 'Local Storage', 'Session Storage', 'Network Persistent State', 'Preferences', 'DawnCache']);

// True if a folder holds the shop's data files.
function hasShopData(folder) {
  try {
    return fs.readdirSync(path.join(folder, 'data')).some((name) => name.endsWith('.jsonl'));
  } catch {
    return false;
  }
}

function copyFolder(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name === 'in-use.lock') continue;
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) copyFolder(source, destination);
    else if (entry.isFile()) fs.copyFileSync(source, destination);
  }
}

// Copies the old app's data into "dataDir" if this app has none yet.
// "appDataDir" is AppData\Roaming. Answers the folder copied from, or null.
function adoptOldData(dataDir, appDataDir) {
  if (hasShopData(dataDir)) return null;
  for (const name of OLD_FOLDER_NAMES) {
    const oldDir = path.join(appDataDir, name);
    if (path.resolve(oldDir) === path.resolve(dataDir) || !hasShopData(oldDir)) continue;
    copyFolder(oldDir, dataDir);
    return oldDir;
  }
  return null;
}

module.exports = { adoptOldData };
