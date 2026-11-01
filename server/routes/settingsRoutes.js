const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { getSettings, EDITABLE_FIELDS } = require('../utils/settings');
const { isLocalDatabase } = require('../config/db');

const router = express.Router();

// The settings as the app sees them, plus whether the data is being saved
// online (MongoDB Atlas) instead of on this computer, so the app can warn.
function forApp(settings) {
  return { ...settings.toJSON(), dataSavedOnline: !isLocalDatabase() };
}

// GET /api/settings
// Returns the store settings. No login needed: the login page shows the
// store name and logo. (Nothing secret is kept in these settings.)
router.get('/', async (req, res) => {
  try {
    res.json(forApp(await getSettings()));
  } catch (error) {
    handleError(res, error, 'Could not load settings.');
  }
});

// PUT /api/settings
// Changes the store settings (owner only).
router.put('/', requireLogin, requireRole('owner'), async (req, res) => {
  try {
    const settings = await getSettings();
    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    });
    await settings.save();
    res.json(forApp(settings));
  } catch (error) {
    handleError(res, error, 'Could not save settings.');
  }
});

module.exports = router;
