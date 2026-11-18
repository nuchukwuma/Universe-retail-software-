const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { getSettings, EDITABLE_FIELDS } = require('../utils/settings');
const { saveImage, deleteImage } = require('../utils/images');

const router = express.Router();

// The settings as the app sees them (secrets removed by the model).
function forApp(settings) {
  return settings.toJSON();
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

// PUT /api/settings/logo
// Sets the shop's logo (shown in the app and on receipts). Owner only.
// Body: { logo: "data:image/png;base64,..." }
router.put('/logo', requireLogin, requireRole('owner'), async (req, res) => {
  try {
    const settings = await getSettings();
    let name;
    try {
      name = saveImage(req.body.logo);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    deleteImage(settings.shopLogo);
    settings.shopLogo = name;
    await settings.save();
    res.json(forApp(settings));
  } catch (error) {
    handleError(res, error, 'Could not save the logo.');
  }
});

// DELETE /api/settings/logo
// Removes the shop's logo. Owner only.
router.delete('/logo', requireLogin, requireRole('owner'), async (req, res) => {
  try {
    const settings = await getSettings();
    deleteImage(settings.shopLogo);
    settings.shopLogo = '';
    await settings.save();
    res.json(forApp(settings));
  } catch (error) {
    handleError(res, error, 'Could not remove the logo.');
  }
});

module.exports = router;
