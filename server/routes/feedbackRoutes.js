const express = require('express');
const Feedback = require('../models/Feedback');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');

const router = express.Router();

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// POST /api/feedback
// Saves a customer's comment (any staff member can do this).
router.post('/', async (req, res) => {
  try {
    const { rating, comment, customerName } = req.body;
    const feedback = await Feedback.create({
      rating,
      comment,
      customerName,
      cashier: req.user._id,
      cashierName: req.user.name,
    });
    res.status(201).json(feedback);
  } catch (error) {
    handleError(res, error, 'Could not save feedback.');
  }
});

// GET /api/feedback
// Lists recent feedback, newest first (managers and owners).
router.get('/', requireRole('owner', 'manager'), async (req, res) => {
  try {
    res.json(await Feedback.find().sort({ createdAt: -1 }).limit(300));
  } catch (error) {
    handleError(res, error, 'Could not load feedback.');
  }
});

module.exports = router;
