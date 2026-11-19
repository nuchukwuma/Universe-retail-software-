const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { licenceStatus, saveLicenceKey, renewOnline } = require('../utils/licence');

const router = express.Router();
router.use(requireLogin);

// GET /api/licence  The shop's licence: trial, licensed or expired.
router.get('/', async (req, res) => {
  try {
    res.json(await licenceStatus());
  } catch (error) {
    handleError(res, error, 'Could not check the licence.');
  }
});

// PUT /api/licence  { key }  Saves a licence key (owner).
router.put('/', requireRole('owner'), async (req, res) => {
  try {
    res.json(await saveLicenceKey(req.body.key));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/licence/renew  Gets this month's key from the licence server (owner, needs internet).
router.post('/renew', requireRole('owner'), async (req, res) => {
  try {
    res.json(await renewOnline());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
