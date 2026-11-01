// The shop's data on disk. Every table ("collection") is kept in memory
// while the app runs, and every change is written straight to that
// table's file, so nothing is lost if the power goes off.
//
// Each table has one file in the data folder, e.g. sales.3.jsonl:
//   {"doc": {...}}        one line per record, as it was when the file was made
//   {"snapshot": true}    the end of that list
//   {"put": {...}}        then one line per change: a record added or changed
//   {"del": "id"}         ...or a record deleted
//
// When a file has many old changes in it, a fresh file with the next number
// (sales.4.jsonl) is written with just the current records, and the older
// file is deleted. Files are never renamed: on Windows, antivirus and the
// search indexer can hold a new file open, and a rename then fails.
// A file whose list was not finished (the power went while writing it) is
// ignored, and the previous file is used. A change that was only half
// written when the power went is ignored too.
const fs = require('fs');
const path = require('path');
const { stringify, parse, clone } = require('./ejson');
const { makeFolder } = require('../utils/paths');

const os = require('os');

const FILE_PATTERN = /^([A-Za-z0-9_-]+)\.(\d+)\.jsonl$/;
const LOCK_FILE = 'in-use.lock';
const LOCK_REFRESH_MS = 30 * 1000; // the running app touches its lock this often
const LOCK_STALE_MS = 90 * 1000; // a lock not touched for this long is left over

// Answers true if a program with this process id is still running.
function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM'; // running, but owned by someone else
  }
}

class Store {
  // "folder" is where the data files are kept. "syncEveryWrite" waits for
  // the disk to confirm every change (safe against power cuts).
  constructor(folder, { syncEveryWrite = true } = {}) {
    this.folder = folder;
    this.syncEveryWrite = syncEveryWrite;
    this.tables = new Map(); // name -> { records: Map(id -> record), generation, fd, changes }
    this.open = false;
  }

  // Reads every table from disk. Stops with an error if another copy of the
  // app is using the same data folder.
  openFolder() {
    makeFolder(this.folder);
    this.takeLock();
    const generations = new Map(); // name -> [numbers]
    for (const fileName of fs.readdirSync(this.folder)) {
      const match = FILE_PATTERN.exec(fileName);
      if (!match) continue;
      if (!generations.has(match[1])) generations.set(match[1], []);
      generations.get(match[1]).push(Number(match[2]));
    }
    for (const [name, numbers] of generations) this.loadTable(name, numbers.sort((a, b) => b - a));
    this.open = true;
  }

  // Makes sure only one program writes to the data folder at a time.
  // A lock left over (after a crash or a power cut) is ignored: the program
  // that made it is not running, or the lock was not touched recently, or it
  // was made before the computer was last switched on. (Windows can give the
  // same process number to another program after a restart.)
  takeLock() {
    const lockPath = path.join(this.folder, LOCK_FILE);
    try {
      const pid = Number(fs.readFileSync(lockPath, 'utf8'));
      const touched = fs.statSync(lockPath).mtimeMs;
      const sinceSwitchOn = Date.now() - os.uptime() * 1000;
      const fresh = Date.now() - touched < LOCK_STALE_MS && touched > sinceSwitchOn;
      if (pid && pid !== process.pid && fresh && processIsRunning(pid)) {
        throw new Error(`The shop's data in ${this.folder} is already open in another copy of the app (process ${pid}). Close it first.`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    fs.writeFileSync(lockPath, String(process.pid));
    this.lockPath = lockPath;
    clearInterval(this.lockTimer);
    this.lockTimer = setInterval(() => {
      try {
        const now = new Date();
        fs.utimesSync(lockPath, now, now);
      } catch {
        // the folder may be gone (e.g. tests); nothing to do
      }
    }, LOCK_REFRESH_MS);
    this.lockTimer.unref(); // never keeps the app running by itself
  }

  // Path of a table's file with this number.
  fileFor(name, generation) {
    return path.join(this.folder, `${name}.${generation}.jsonl`);
  }

  // Loads a table from the newest complete file ("numbers" newest first).
  loadTable(name, numbers) {
    for (const generation of numbers) {
      const file = this.fileFor(name, generation);
      const loaded = this.readFile(file);
      if (!loaded) {
        console.warn(`Data file ${file} was not finished (power cut?). Using the one before it.`);
        continue;
      }
      const fd = fs.openSync(file, 'a');
      const table = { records: loaded.records, generation, fd, changes: loaded.changes };
      this.tables.set(name, table);
      // Older files, and newer ones that were never finished, are no longer
      // needed (deleting may fail if antivirus holds one: harmless).
      for (const other of numbers.filter((n) => n !== generation)) this.deleteFile(this.fileFor(name, other));
      if (table.changes > 500 && table.changes > table.records.size) this.compact(name);
      return;
    }
    // No complete file: start the table empty.
    this.tables.set(name, null);
    this.writeTable(name, [], Math.max(...numbers) + 1);
  }

  // Reads one data file. Returns null if its record list was not finished.
  readFile(file) {
    const buffer = fs.readFileSync(file);
    // A last line without its line ending was cut off by a power cut: drop it,
    // and cut it off the file too so new changes start on a clean line.
    const end = buffer.lastIndexOf(0x0a) + 1;
    if (end < buffer.length) {
      console.warn(`Ignoring a half-written change at the end of ${file}.`);
      fs.truncateSync(file, end);
    }
    const lines = buffer.subarray(0, end).toString('utf8').split('\n');

    const records = new Map();
    let complete = false;
    let changes = 0;
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      let entry;
      try {
        entry = parse(line);
      } catch (error) {
        console.error(`Skipping a damaged line ${index + 1} in ${file}: ${error.message}`);
        return;
      }
      if (!complete) {
        if (entry.snapshot) complete = true;
        else if (entry.doc) records.set(String(entry.doc._id), entry.doc);
        return;
      }
      if (entry.put) {
        records.set(String(entry.put._id), entry.put);
        changes += 1;
      } else if ('del' in entry) {
        records.delete(String(entry.del));
        changes += 1;
      }
    });
    return complete ? { records, changes } : null;
  }

  // Deletes a file, if Windows lets us (a leftover old file is harmless).
  deleteFile(file) {
    try {
      fs.unlinkSync(file);
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn(`Could not delete old data file ${file} (${error.code}). It will be tried again later.`);
    }
  }

  // Writes a fresh file for a table holding exactly "records", then uses it.
  writeTable(name, records, generation) {
    const file = this.fileFor(name, generation);
    const fd = fs.openSync(file, 'w');
    const map = new Map();
    let text = '';
    for (const record of records) {
      map.set(String(record._id), record);
      text += `${stringify({ doc: record })}\n`;
      if (text.length > 1 << 20) {
        fs.writeSync(fd, text);
        text = '';
      }
    }
    text += `${stringify({ snapshot: true, count: records.length })}\n`;
    fs.writeSync(fd, text);
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    const old = this.tables.get(name);
    if (old) fs.closeSync(old.fd);
    this.tables.set(name, { records: map, generation, fd: fs.openSync(file, 'a'), changes: 0 });
    if (old) this.deleteFile(this.fileFor(name, old.generation));
  }

  // Rewrites a table's file with just its current records.
  compact(name) {
    const table = this.tables.get(name);
    this.writeTable(name, [...table.records.values()], table.generation + 1);
  }

  // Adds one line to a table's file.
  append(table, entry) {
    fs.writeSync(table.fd, `${stringify(entry)}\n`);
    if (this.syncEveryWrite) fs.fsyncSync(table.fd);
    table.changes += 1;
  }

  // The table with this name, made (empty) if it does not exist yet.
  table(name) {
    if (!this.open) throw new Error('The database is not open.');
    if (!this.tables.has(name)) this.writeTable(name, [], 1);
    return this.tables.get(name);
  }

  // The names of all tables.
  names() {
    return [...this.tables.keys()];
  }

  // True if a table exists.
  has(name) {
    return this.tables.has(name);
  }

  // Every record in a table. These are the saved records themselves:
  // callers must not change them (copy them first).
  all(name) {
    return this.tables.has(name) ? [...this.tables.get(name).records.values()] : [];
  }

  // One record by id, or undefined.
  get(name, id) {
    return this.tables.has(name) ? this.tables.get(name).records.get(String(id)) : undefined;
  }

  // Adds or replaces one record (a copy is kept).
  put(name, record) {
    const table = this.table(name);
    const saved = clone(record);
    this.append(table, { put: saved });
    table.records.set(String(saved._id), saved);
    return saved;
  }

  // Deletes one record. Answers true if it was there.
  remove(name, id) {
    const table = this.table(name);
    if (!table.records.has(String(id))) return false;
    this.append(table, { del: String(id) });
    table.records.delete(String(id));
    return true;
  }

  // Replaces everything in a table (used by restore and data updates).
  replaceAll(name, records) {
    const current = this.tables.get(name);
    this.writeTable(name, records.map(clone), current ? current.generation + 1 : 1);
  }

  // Deletes a whole table and its file. An empty file is written first, so
  // if Windows will not let the file be deleted, the table comes back empty
  // (never with its old records).
  drop(name) {
    const table = this.tables.get(name);
    if (!table) return;
    this.writeTable(name, [], table.generation + 1);
    const empty = this.tables.get(name);
    fs.closeSync(empty.fd);
    this.tables.delete(name);
    this.deleteFile(this.fileFor(name, empty.generation));
  }

  // Closes every file. The store can be opened again afterwards.
  close() {
    for (const table of this.tables.values()) {
      try {
        fs.closeSync(table.fd);
      } catch {
        // already closed
      }
    }
    this.tables.clear();
    this.open = false;
    clearInterval(this.lockTimer);
    if (this.lockPath) {
      try {
        if (Number(fs.readFileSync(this.lockPath, 'utf8')) === process.pid) fs.unlinkSync(this.lockPath);
      } catch {
        // nothing to tidy
      }
    }
  }
}

module.exports = { Store };
