// Backups need the desktop app (they are folders on the computer or a USB
// drive). In the demo every backup action answers with that.
const MESSAGE = 'Backups are made by the desktop app. This demo keeps its data in your browser.';

function notInDemo() {
  const error = new Error(MESSAGE);
  error.code = 'DEMO';
  throw error;
}

module.exports = {
  createBackup: async () => notInDemo(),
  listBackups: async () => [],
  restoreBackup: async () => notInDemo(),
  checkFolderWritable: async () => notInDemo(),
  backupFolderFrom: () => '/demo/backups',
  startBackupSchedule: () => {},
  stopBackupSchedule: () => {},
  backupIfDue: async () => {},
};
