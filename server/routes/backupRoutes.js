const express = require('express');
const path = require('path');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { getSettings } = require('../utils/settings');
const { defaultBackupDir } = require('../utils/paths');
const {
  createBackup, listBackups, restoreBackup, checkFolderWritable, backupFolderFrom,
} = require('../utils/backup');

const router = express.Router();

// Only the owner can make, see or restore backups.
router.use(requireLogin, requireRole('owner'));

// GET /api/backups
// The backup folder, when the last backup was made, and the list of backups.
router.get('/', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      folder: backupFolderFrom(settings),
      defaultFolder: defaultBackupDir(),
      autoBackupEnabled: settings.autoBackupEnabled,
      lastBackupAt: settings.lastBackupAt,
      lastBackupError: settings.lastBackupError,
      backups: await listBackups(),
    });
  } catch (error) {
    handleError(res, error, 'Could not load the backups.');
  }
});

// POST /api/backups
// Makes a backup right now.
router.post('/', async (req, res) => {
  try {
    const result = await createBackup('manual');
    res.status(201).json({ message: `Backup saved in ${result.folder}`, ...result });
  } catch (error) {
    res.status(400).json({ message: `Backup failed: ${error.message}` });
  }
});

// PUT /api/backups/settings
// Changes the backup folder and/or switches automatic backups on or off.
// Body: { folder?, autoBackupEnabled? }  (folder '' = the default folder)
router.put('/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    const { folder, autoBackupEnabled } = req.body;

    if (typeof folder === 'string') {
      const chosen = folder.trim();
      if (chosen && !path.isAbsolute(chosen)) {
        return res.status(400).json({ message: 'Enter a full folder path, e.g. E:\\Shop Backups' });
      }
      checkFolderWritable(chosen || defaultBackupDir());
      settings.backupFolder = chosen;
    }
    if (typeof autoBackupEnabled === 'boolean') {
      settings.autoBackupEnabled = autoBackupEnabled;
    }

    await settings.save();
    res.json({ message: 'Backup settings saved.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/backups/restore
// Replaces ALL current data with a backup. The owner must type RESTORE.
// Body: { name, confirm: 'RESTORE' }
router.post('/restore', async (req, res) => {
  try {
    if (req.body.confirm !== 'RESTORE') {
      return res.status(400).json({ message: 'Type RESTORE to confirm.' });
    }
    const result = await restoreBackup(String(req.body.name || ''));
    res.json({ message: 'Backup restored. Everyone must log in again.', ...result });
  } catch (error) {
    res.status(400).json({ message: `Restore failed: ${error.message}` });
  }
});

module.exports = router;
