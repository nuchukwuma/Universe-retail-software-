// Backups: copies ALL the shop's data (every database table plus the
// uploaded pictures) into a dated folder, and can put it all back.
//
// A backup folder looks like:
//   universe-pos-backup-2026-10-27-1830/
//     manifest.json            <- what is inside, and when it was made
//     collections/sales.jsonl  <- one record per line (one file per table)
//     uploads/...              <- product and logo pictures
//
// Records are saved as "Extended JSON" so ids and dates come back exactly.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { once } = require('events');
const mongoose = require('mongoose');
const { getSettings } = require('./settings');
const { makeFolder, uploadsDir, defaultBackupDir } = require('./paths');

const { EJSON } = mongoose.mongo.BSON;
const BACKUP_PREFIX = 'universe-pos-backup-';
const KEEP_AUTOMATIC_BACKUPS = 30; // older automatic backups are deleted
const CHECK_EVERY_MS = 60 * 60 * 1000; // check once an hour if a backup is due
const BACKUP_EVERY_MS = 24 * 60 * 60 * 1000; // automatic backup once a day
const INSERT_BATCH_SIZE = 500;

// Returns the folder backups go into (chosen on the Backup page, or the default).
function backupFolderFrom(settings) {
  return settings.backupFolder || defaultBackupDir();
}

// Makes a folder name from the date and time, e.g. universe-pos-backup-2026-10-27-1830.
function backupName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return BACKUP_PREFIX + stamp;
}

// Returns a backup name not used yet in "parent" (two backups made in
// the same second get -2, -3... added).
function freeBackupName(parent) {
  const base = backupName();
  let name = base;
  for (let n = 2; fs.existsSync(path.join(parent, name)) || fs.existsSync(path.join(parent, `${name}.partial`)); n += 1) {
    name = `${base}-${n}`;
  }
  return name;
}

// Copies a folder and everything inside it.
function copyFolder(from, to) {
  if (!fs.existsSync(from)) return;
  makeFolder(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyFolder(source, target);
    else fs.copyFileSync(source, target);
  }
}

// Adds up the size of every file in a folder (in bytes).
function folderSize(folder) {
  let total = 0;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    total += entry.isDirectory() ? folderSize(full) : fs.statSync(full).size;
  }
  return total;
}

// Writes every record of one database table to a .jsonl file, one per line.
// Returns how many records were written.
async function exportCollection(db, collectionName, file) {
  const stream = fs.createWriteStream(file);
  let count = 0;
  for await (const record of db.collection(collectionName).find()) {
    if (!stream.write(EJSON.stringify(record, { relaxed: false }) + '\n')) {
      await once(stream, 'drain'); // wait if the disk is slower than the database
    }
    count += 1;
  }
  stream.end();
  await once(stream, 'finish');
  return count;
}

// Makes a complete backup now. "reason" is 'manual', 'automatic' or
// 'before-restore'. Returns { name, folder, counts }.
async function createBackup(reason = 'manual') {
  const settings = await getSettings();
  const parent = backupFolderFrom(settings);
  const name = freeBackupName(parent);
  const finalFolder = path.join(parent, name);
  // Write into a ".partial" folder first, so a half-finished backup
  // (e.g. the laptop switched off) is never mistaken for a good one.
  const workFolder = `${finalFolder}.partial`;

  try {
    makeFolder(path.join(workFolder, 'collections'));

    const db = mongoose.connection.db;
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const counts = {};
    for (const { name: collectionName } of collections) {
      if (collectionName.startsWith('system.')) continue;
      counts[collectionName] = await exportCollection(db, collectionName, path.join(workFolder, 'collections', `${collectionName}.jsonl`));
    }

    copyFolder(uploadsDir(), path.join(workFolder, 'uploads'));

    const manifest = {
      app: 'Universe POS',
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      reason,
      storeName: settings.storeName,
      counts,
    };
    fs.writeFileSync(path.join(workFolder, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.renameSync(workFolder, finalFolder);

    settings.lastBackupAt = new Date();
    settings.lastBackupError = '';
    await settings.save();

    if (reason === 'automatic') pruneOldBackups(parent);
    return { name, folder: finalFolder, counts };
  } catch (error) {
    fs.rmSync(workFolder, { recursive: true, force: true });
    settings.lastBackupError = `${new Date().toLocaleString('en-NG')}: ${error.message}`;
    await settings.save();
    throw error;
  }
}

// Reads the manifest of every backup in the backup folder, newest first.
async function listBackups() {
  const settings = await getSettings();
  const parent = backupFolderFrom(settings);
  if (!fs.existsSync(parent)) return [];

  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(BACKUP_PREFIX) && !entry.name.endsWith('.partial'))
    .map((entry) => {
      const folder = path.join(parent, entry.name);
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
        const records = Object.values(manifest.counts || {}).reduce((sum, n) => sum + n, 0);
        return { name: entry.name, createdAt: manifest.createdAt, reason: manifest.reason, counts: manifest.counts, records, sizeBytes: folderSize(folder) };
      } catch {
        return null; // not a complete backup - ignore it
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Deletes the oldest AUTOMATIC backups, keeping the newest 30.
// Manual backups are never deleted automatically.
function pruneOldBackups(parent) {
  const automatic = fs
    .readdirSync(parent)
    .filter((name) => name.startsWith(BACKUP_PREFIX) && !name.endsWith('.partial'))
    .map((name) => {
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(parent, name, 'manifest.json'), 'utf8'));
        return manifest.reason === 'automatic' ? { name, createdAt: manifest.createdAt } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  automatic.slice(KEEP_AUTOMATIC_BACKUPS).forEach(({ name }) => {
    fs.rmSync(path.join(parent, name), { recursive: true, force: true });
  });
}

// Reads a .jsonl file back into a database table, in batches.
async function importCollection(db, collectionName, file) {
  const lines = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let batch = [];
  let count = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    batch.push(EJSON.parse(line, { relaxed: false }));
    if (batch.length >= INSERT_BATCH_SIZE) {
      await db.collection(collectionName).insertMany(batch, { ordered: false });
      count += batch.length;
      batch = [];
    }
  }
  if (batch.length) {
    await db.collection(collectionName).insertMany(batch, { ordered: false });
    count += batch.length;
  }
  return count;
}

// Replaces ALL current data with the data in a backup.
// A "before-restore" backup of the current data is made first, so a
// mistake can be undone.
async function restoreBackup(name) {
  const settings = await getSettings();
  const parent = backupFolderFrom(settings);
  // Only a plain folder name is allowed (no "..\" tricks).
  if (path.basename(name) !== name || !name.startsWith(BACKUP_PREFIX)) {
    throw new Error('That is not a backup name.');
  }
  const folder = path.join(parent, name);
  if (!fs.existsSync(path.join(folder, 'manifest.json'))) {
    throw new Error('That backup could not be found or is incomplete.');
  }

  await createBackup('before-restore');

  const db = mongoose.connection.db;
  const backupFiles = fs.readdirSync(path.join(folder, 'collections')).filter((f) => f.endsWith('.jsonl'));
  const backupCollections = backupFiles.map((f) => f.replace(/\.jsonl$/, ''));

  // Empty every table (including ones the backup does not have).
  const current = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name: collectionName } of current) {
    if (!collectionName.startsWith('system.')) await db.collection(collectionName).deleteMany({});
  }

  // Put the backup's records back.
  const counts = {};
  for (const collectionName of backupCollections) {
    counts[collectionName] = await importCollection(db, collectionName, path.join(folder, 'collections', `${collectionName}.jsonl`));
  }

  // Put the pictures back.
  copyFolder(path.join(folder, 'uploads'), uploadsDir());
  return { name, counts };
}

// Checks if the backup folder can be written to (e.g. the USB drive is
// plugged in). Throws a helpful error if not.
function checkFolderWritable(folder) {
  try {
    makeFolder(folder);
    const testFile = path.join(folder, '.universe-pos-write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
  } catch (error) {
    throw new Error(`Cannot save backups in "${folder}" (${error.code || error.message}). If it is a USB drive, plug it in.`);
  }
}

// Makes the automatic backup if the last one is more than a day old.
async function backupIfDue() {
  const settings = await getSettings();
  if (!settings.autoBackupEnabled) return;
  const last = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
  if (Date.now() - last < BACKUP_EVERY_MS) return;

  try {
    const result = await createBackup('automatic');
    console.log(`Automatic backup saved: ${result.folder}`);
  } catch (error) {
    console.error('Automatic backup failed:', error.message);
  }
}

// Starts checking (a minute after start-up, then every hour) whether
// the daily automatic backup is due.
function startBackupSchedule() {
  setTimeout(() => backupIfDue().catch(() => {}), 60 * 1000);
  setInterval(() => backupIfDue().catch(() => {}), CHECK_EVERY_MS);
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  checkFolderWritable,
  backupFolderFrom,
  startBackupSchedule,
  backupIfDue,
};
