// The MongoDB that comes with the app (MongoDB 4.2, the last version that
// runs on Windows 8.1). The installer puts it in resources\mongodb, and the
// shop's data goes in the app's data folder:
//   C:\Users\<name>\AppData\Roaming\Universe POS\database
//
// It is only started when it is needed:
// - If a MongoDB is already answering (e.g. one installed separately, as
//   older versions of this app needed), that one is used, so its data is
//   kept.
// - If MongoDB is installed as a Windows service but not answering yet
//   (just after switching on), the app waits for it instead: starting an
//   empty database here would make the shop look empty.
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, execFile } = require('child_process');

const READY_TIMEOUT_MS = 90 * 1000; // after a power cut, MongoDB may need a while to check its files
const STOP_TIMEOUT_MS = 15 * 1000;

let child = null; // the MongoDB this app started, while it runs
let lastExitCode = null;

// Windows' code for "a file the program needs (a DLL) is missing".
const DLL_NOT_FOUND = 0xc0000135;

// Answers true if something accepts connections on this port.
function portAnswers(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (answer) => {
      socket.destroy();
      resolve(answer);
    };
    socket.setTimeout(1000, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

// Answers true if MongoDB is installed as a Windows service on this computer.
function mongoServiceInstalled() {
  if (process.platform !== 'win32') return Promise.resolve(false);
  return new Promise((resolve) => {
    execFile('sc', ['query', 'MongoDB'], { windowsHide: true }, (error) => resolve(!error));
  });
}

// Reads the last lines of MongoDB's own log, to explain a failed start.
function lastLogLines(logFile, count = 5) {
  try {
    return fs.readFileSync(logFile, 'utf8').trim().split(/\r?\n/).slice(-count).join('\n');
  } catch {
    return '';
  }
}

// Waits until MongoDB answers on the port, or fails if it stops or takes too long.
async function waitUntilReady(port, logFile) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await portAnswers(port)) return;
    if (!child) {
      if (lastExitCode === DLL_NOT_FOUND) {
        throw new Error('The database that comes with the app could not start because a Windows file it needs is missing. Run Windows Update until no updates are left (on Windows 8.1 in particular update KB2999226), then open the app again.');
      }
      throw new Error(`The database that comes with the app stopped while starting. Its log says:\n${lastLogLines(logFile)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The database that comes with the app did not start within ${READY_TIMEOUT_MS / 1000} seconds. See ${logFile}`);
}

// Makes sure a MongoDB is answering on "port", starting the app's own if needed.
// "mongodDir" is the folder with mongod.exe; "dataDir" is the app's data folder.
async function ensureDatabase({ port, mongodDir, dataDir }) {
  if (await portAnswers(port)) {
    if (!child) console.log(`Using the MongoDB already running on port ${port}.`);
    return;
  }

  const mongod = path.join(mongodDir, process.platform === 'win32' ? 'mongod.exe' : 'mongod');
  if (!fs.existsSync(mongod)) {
    throw new Error('Could not connect to MongoDB, and this copy of the app does not include one. Is MongoDB installed and running?');
  }
  if (await mongoServiceInstalled()) {
    throw new Error('Could not connect to MongoDB (connect ECONNREFUSED). MongoDB is installed on this computer but is not running yet. Is MongoDB installed and running?');
  }

  const dbPath = path.join(dataDir, 'database');
  const logFile = path.join(dataDir, 'logs', 'mongod.log');
  fs.mkdirSync(dbPath, { recursive: true });
  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  if (!child) {
    console.log(`Starting the database that comes with the app (data in ${dbPath})...`);
    child = spawn(mongod, [
      '--dbpath', dbPath,
      '--port', String(port),
      '--bind_ip', '127.0.0.1', // this laptop only
      '--wiredTigerCacheSizeGB', '0.25', // keep memory use low on an older laptop
      '--logpath', logFile,
      '--logappend',
    ], { cwd: mongodDir, windowsHide: true, stdio: 'ignore' });
    lastExitCode = null;
    child.once('exit', (code) => {
      console.log(`The app's database stopped (exit code ${code}).`);
      lastExitCode = code;
      child = null;
    });
    child.once('error', (error) => {
      console.error('The app\'s database could not be started:', error.message);
      child = null;
    });
  }
  await waitUntilReady(port, logFile);
  console.log('The database that comes with the app is running.');
}

// Stops the app's own MongoDB cleanly (if this app started it), so its
// files are always left in good order. "MongoClient" comes from mongoose.
async function stopDatabase(uri, MongoClient) {
  if (!child) return;
  const running = child;
  const stopped = new Promise((resolve) => running.once('exit', resolve));
  try {
    const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 3000 });
    await client.db('admin').command({ shutdown: 1 }).catch(() => {}); // the connection closes as it shuts down
    await client.close().catch(() => {});
  } catch (error) {
    console.error('Could not ask the database to stop:', error.message);
  }
  const timer = new Promise((resolve) => setTimeout(() => resolve('timeout'), STOP_TIMEOUT_MS));
  if ((await Promise.race([stopped, timer])) === 'timeout') {
    console.error('The database did not stop in time; ending it.');
    running.kill();
  }
}

module.exports = { ensureDatabase, stopDatabase, portAnswers };
