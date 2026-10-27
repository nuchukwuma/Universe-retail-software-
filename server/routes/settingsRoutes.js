const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { getSettings, EDITABLE_FIELDS } = require('../utils/settings');

const router = express.Router();

// GET /api/settings
// Returns the store settings. No login needed: the login page shows the
// store name and logo. (Nothing secret is kept in these settings.)
router.get('/', async (req, res) => {
  try {
    res.json(await getSettings());
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
    res.json(settings);
  } catch (error) {
    handleError(res, error, 'Could not save settings.');
  }
});

module.exports = router;
