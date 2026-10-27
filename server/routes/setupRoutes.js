const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const handleError = require('../utils/handleError');
const { getSettings } = require('../utils/settings');
const { loadSampleCatalogue } = require('../utils/sampleData');

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
// Body: { storeName, ownerName, username, password, loadSampleData }
router.post('/', async (req, res) => {
  try {
    if ((await User.countDocuments()) > 0) {
      return res.status(403).json({ message: 'This app is already set up. Please log in.' });
    }

    const { storeName, ownerName, username, password, loadSampleData } = req.body;
    if (!ownerName || !username || !password) {
      return res.status(400).json({ message: 'Enter your name, a username and a password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'The password must be at least 6 characters.' });
    }

    const owner = new User({ name: ownerName, username, role: 'owner' });
    await owner.setPassword(password);
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

module.exports = router;
