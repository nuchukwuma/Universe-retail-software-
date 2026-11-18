// The demo has no folders: its data lives in the browser.
module.exports = {
  dataDir: () => '/demo',
  makeFolder: () => {},
  defaultBackupDir: () => '/demo/backups',
};
