// Copies the server code and the built React app into desktop/app,
// ready to be packed into the desktop app.
//   desktop/app/server  <- server (without node_modules, .env, uploads...)
//   desktop/app/client  <- client/dist (run "npm run build" in client first)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(__dirname, '..', 'app');

// Files and folders of the server that must not go into the app.
const SKIP = new Set(['node_modules', '.env', 'uploads', 'backups', 'logs', 'package-lock.json']);

// Copies a folder, leaving out anything named in SKIP and any .log file.
function copyFolder(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.endsWith('.log')) continue;
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) copyFolder(source, destination);
    else fs.copyFileSync(source, destination);
  }
}

// Starts each copy from an empty folder, so deleted files do not linger.
function main() {
  const clientDist = path.join(ROOT, 'client', 'dist');
  if (!fs.existsSync(path.join(clientDist, 'index.html'))) {
    console.error('client/dist is missing. Run "npm run build" in the client folder first.');
    process.exit(1);
  }

  fs.rmSync(TARGET, { recursive: true, force: true });
  copyFolder(path.join(ROOT, 'server'), path.join(TARGET, 'server'));
  copyFolder(clientDist, path.join(TARGET, 'client'));
  console.log('Copied server and client into desktop/app');
}

main();
