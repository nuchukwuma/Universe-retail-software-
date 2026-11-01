// Universe POS desktop app (Electron).
// It runs the server (Express) inside the app, on this laptop only
// (127.0.0.1), and shows the app's screens in a window. All the shop's
// information stays in data files on this laptop (in the app's data folder);
// no database program is needed.
const path = require('path');
const net = require('net');
const { app, BrowserWindow, Menu, session, shell } = require('electron');
const { loadConfig, startLogFile } = require('./electron/config');
const { registerIpcHandlers } = require('./electron/ipc');
const { buildMenu } = require('./electron/menu');

const APP_DIR = path.join(__dirname, 'app'); // server + built client (see scripts/copy-app.js)
const ALLOWED_PERMISSIONS = ['clipboard-sanitized-write', 'fullscreen'];

let mainWindow = null;
let server = null; // the running Express server
let starting = null; // the start that is in progress, if any
let config = null;
let dataDir = '';
let logFolder = '';
let quitting = false;

// Finds a free port, starting with "port" and counting up.
function findFreePort(port, triesLeft = 20) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && triesLeft > 0) resolve(findFreePort(port + 1, triesLeft - 1));
      else reject(error);
    });
    tester.once('listening', () => tester.close(() => resolve(port)));
    tester.listen(port, '127.0.0.1');
  });
}

// Starts the server (once) and answers with its port.
async function startBackend() {
  if (server) return server.address().port;
  const { startServer } = require(path.join(APP_DIR, 'server', 'app.js'));
  const port = await findFreePort(config.port);
  server = await startServer({ port, host: '127.0.0.1', clientDir: path.join(APP_DIR, 'client') });
  return port;
}

// Starts the server and shows the app. If that fails (usually because
// the shop's data could not be opened), shows error.html with a "Try again" button.
function openApp() {
  if (!starting) {
    starting = (async () => {
      try {
        const port = await startBackend();
        await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
      } catch (error) {
        console.error('Universe POS could not start:', error);
        await mainWindow.loadFile(path.join(__dirname, 'error.html'), { query: { message: error.message } });
      } finally {
        starting = null;
      }
    })();
  }
  return starting;
}

// Stops everything this app started, in order.
async function shutDown() {
  if (server) {
    const { stopServer } = require(path.join(APP_DIR, 'server', 'app.js'));
    await stopServer(server).catch((error) => console.error('Could not stop the server cleanly:', error));
  }
}

// Keeps the window on the app's own screens. Web links open in the
// normal web browser instead.
function protectNavigation(contents) {
  const isAppAddress = (url) => url.startsWith('http://127.0.0.1:') || url.startsWith('file://');
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !isAppAddress(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (!isAppAddress(url)) event.preventDefault();
  });
}

// Makes the main window (maximized, menu bar hidden).
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Universe POS',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#ffffff',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  protectNavigation(mainWindow.webContents);
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Runs once Electron is ready.
async function onReady() {
  dataDir = app.getPath('userData');
  logFolder = startLogFile(dataDir);
  config = loadConfig(dataDir);
  console.log(`Universe POS ${app.getVersion()} starting (Electron ${process.versions.electron}, Node ${process.versions.node})`);

  // Settings the server reads (see server/utils/paths.js and config/db.js).
  process.env.DATA_DIR = dataDir;
  process.env.JWT_SECRET = config.jwtSecret;

  // Only allow copying and full screen. (No camera: barcodes come from a
  // USB or Bluetooth scanner, which works like a keyboard.)
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.includes(permission));
  });

  registerIpcHandlers({
    'retry-start': () => openApp(),
    'app-info': () => ({ version: app.getVersion(), dataDir, logFolder }),
  });
  Menu.setApplicationMenu(buildMenu({ openDataFolder: () => shell.openPath(dataDir) }));

  createWindow();
  await mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  await openApp();
}

// Only one copy of the app may run (two tills on one laptop would clash).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(onReady);

  app.on('window-all-closed', () => app.quit());

  // Close the server, the database connection and the app's own database
  // (if it started one) before the app exits.
  app.on('will-quit', (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    shutDown().finally(() => app.quit());
  });
}
