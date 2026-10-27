// The desktop app's own settings, kept in config.json inside the app's
// data folder (on Windows: C:\Users\<name>\AppData\Roaming\Universe POS).
// The file is made the first time the app starts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULTS = {
  port: 5757, // the address the app's screens are served on (127.0.0.1 only)
  mongoUri: 'mongodb://127.0.0.1:27017/universe_pos', // MongoDB on this laptop
};

// Reads config.json, filling in anything missing, and saves it back.
// The JWT secret (used to sign logins) is made at random once and kept.
function loadConfig(dataDir) {
  const file = path.join(dataDir, 'config.json');
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('config.json could not be read, making a new one:', error.message);
  }

  const config = { ...DEFAULTS, ...saved };
  if (!config.jwtSecret) config.jwtSecret = crypto.randomBytes(48).toString('hex');

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  return config;
}

// Copies everything written with console.log/warn/error into a log file,
// so problems on the shop laptop can be looked at later.
function startLogFile(dataDir) {
  const folder = path.join(dataDir, 'logs');
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'universe-pos.log');

  // Start a fresh log when the old one gets big (over 5 MB).
  try {
    if (fs.statSync(file).size > 5 * 1024 * 1024) fs.renameSync(file, path.join(folder, 'universe-pos.old.log'));
  } catch (error) {
    // no log file yet
  }

  const stream = fs.createWriteStream(file, { flags: 'a' });
  for (const level of ['log', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      const text = args.map((a) => (a instanceof Error ? a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      stream.write(`${new Date().toISOString()} [${level}] ${text}\n`);
    };
  }
  return folder;
}

module.exports = { loadConfig, startLogFile };
