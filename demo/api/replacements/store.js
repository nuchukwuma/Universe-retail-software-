// The demo's data store: the same interface as server/db/store.js, but the
// shop's data lives in this browser (localStorage) instead of files.
// Changes are saved a moment after they happen, and when the page is hidden.
const { stringify, parse, clone } = require('../../../server/db/ejson');

const PREFIX = 'hd_demo_table:';

class Store {
  constructor() {
    this.tables = new Map(); // name -> Map(id -> record)
    this.dirty = new Set();
    this.open = false;
    this.timer = null;
    this.paused = false; // while seeding, nothing is saved until the end
  }

  openFolder() {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      try {
        const records = parse(localStorage.getItem(key));
        this.tables.set(key.slice(PREFIX.length), new Map(records.map((r) => [String(r._id), r])));
      } catch {
        // a damaged table starts empty
      }
    }
    this.open = true;
    const flush = () => this.save();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  }

  table(name) {
    if (!this.open) throw new Error('The database is not open.');
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name);
  }

  changed(name) {
    this.dirty.add(name);
    if (this.paused) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), 400);
  }

  // Writes every changed table to the browser's storage.
  save() {
    clearTimeout(this.timer);
    for (const name of this.dirty) {
      const records = this.tables.has(name) ? [...this.tables.get(name).values()] : null;
      try {
        if (records) localStorage.setItem(PREFIX + name, stringify(records));
        else localStorage.removeItem(PREFIX + name);
      } catch (error) {
        console.warn(`The demo could not save ${name} in this browser (${error.message}).`);
      }
    }
    this.dirty.clear();
  }

  names() {
    return [...this.tables.keys()];
  }

  has(name) {
    return this.tables.has(name);
  }

  all(name) {
    return this.tables.has(name) ? [...this.tables.get(name).values()] : [];
  }

  get(name, id) {
    return this.tables.has(name) ? this.tables.get(name).get(String(id)) : undefined;
  }

  put(name, record) {
    const saved = clone(record);
    this.table(name).set(String(saved._id), saved);
    this.changed(name);
    return saved;
  }

  remove(name, id) {
    const table = this.table(name);
    const had = table.delete(String(id));
    if (had) this.changed(name);
    return had;
  }

  replaceAll(name, records) {
    this.tables.set(name, new Map(records.map((r) => {
      const saved = clone(r);
      return [String(saved._id), saved];
    })));
    this.changed(name);
  }

  drop(name) {
    this.tables.delete(name);
    this.changed(name);
  }

  close() {
    this.save();
    this.open = false;
  }
}

// Forgets every demo table (Start again).
Store.clearAll = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
};

module.exports = { Store };
