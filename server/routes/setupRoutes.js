const fs = require('fs');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const handleError = require('../utils/handleError');
const { getSettings } = require('../utils/settings');
const { loadSampleCatalogue } = require('../utils/sampleData');
const { listBackups, restoreBackup } = require('../utils/backup');
const { runMigrations } = require('../utils/migrations');
const { securityQuestionsProblem } = require('../utils/securityQuestions');

const router = express.Router();

// GET /api/setup/status
// Tells the app whether this is the very first start (no staff accounts yet).
router.get('/status', async (req, res) => {
  try {
    res.json({ needsSetup: (await User.countDocuments()) === 0 });
  } catch (error) {
    handleError(res, error, 'Could not check setup.');
  }
});

// POST /api/setup
// First-time setup: creates the owner account and saves the store name.
// Only works while there are NO staff accounts, so nobody can use it later.
// Body: { storeName, ownerName, username, password, securityQuestions, loadSampleData }
// securityQuestions: three { question, answer }, for "Forgot your password?".
router.post('/', async (req, res) => {
  try {
    if ((await User.countDocuments()) > 0) {
      return res.status(403).json({ message: 'This app is already set up. Please log in.' });
    }

    const { storeName, ownerName, username, password, securityQuestions, loadSampleData } = req.body;
    if (!ownerName || !username || !password) {
      return res.status(400).json({ message: 'Enter your name, a username and a password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'The password must be at least 6 characters.' });
    }
    const questionsProblem = securityQuestionsProblem(securityQuestions);
    if (questionsProblem) {
      return res.status(400).json({ message: questionsProblem });
    }

    const owner = new User({ name: ownerName, username, role: 'owner' });
    await owner.setPassword(password);
    await owner.setSecurityQuestions(securityQuestions);
    await owner.save();

    if (storeName && storeName.trim()) {
      const settings = await getSettings();
      settings.storeName = storeName.trim();
      await settings.save();
    }

    if (loadSampleData) {
      await loadSampleCatalogue(() => {});
    }

    // Log the owner straight in.
    const token = jwt.sign({ userId: owner._id, role: owner.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    });
    res.status(201).json({ token, user: owner });
  } catch (error) {
    handleError(res, error, 'Could not finish the setup.');
  }
});

// Answers 403 (and true) if the app already has staff accounts: bringing
// back a backup from this screen is only for a brand-new install.
async function alreadySetUp(res) {
  if ((await User.countDocuments()) === 0) return false;
  res.status(403).json({ message: 'This app is already set up. Please log in. (The owner can restore backups on the Backup page.)' });
  return true;
}

// Reads and checks the folder path sent by the app.
function backupFolderFrom(value) {
  const folder = String(value || '').trim();
  if (!folder || !path.isAbsolute(folder)) throw new Error('Enter the full path of the folder, e.g. E:\\Shop Backups');
  if (!fs.existsSync(folder)) throw new Error(`The folder ${folder} was not found. If it is a USB drive, plug it in.`);
  return folder;
}

// GET /api/setup/backups?folder=E:\Shop Backups
// First start only: the backups in a folder (e.g. on a USB drive), so the
// shop's data can be brought back instead of starting empty.
router.get('/backups', async (req, res) => {
  try {
    if (await alreadySetUp(res)) return;
    const folder = backupFolderFrom(req.query.folder);
    res.json({ folder, backups: await listBackups(folder) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/setup/restore
// First start only: puts a backup's data in (staff, products, sales,
// settings). Then everyone signs in with their usual username and password.
// Body: { folder, name }
router.post('/restore', async (req, res) => {
  try {
    if (await alreadySetUp(res)) return;
    const folder = backupFolderFrom(req.body.folder);
    const result = await restoreBackup(String(req.body.name || ''), folder);
    await runMigrations(); // tidy data from an older version of the app
    res.json({ message: 'The backup is restored. Sign in with your usual username and password.', ...result });
  } catch (error) {
    res.status(400).json({ message: `Restore failed: ${error.message}` });
  }
});

module.exports = router;
