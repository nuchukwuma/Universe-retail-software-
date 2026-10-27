const express = require('express');
const HeldBill = require('../models/HeldBill');
const { requireLogin } = require('../middleware/auth');
const handleError = require('../utils/handleError');

const router = express.Router();

// Every route in this file needs a logged-in user (cashiers included).
router.use(requireLogin);

// GET /api/held-bills
// Lists bills on hold, oldest first (first come, first served).
router.get('/', async (req, res) => {
  try {
    res.json(await HeldBill.find().sort({ createdAt: 1 }));
  } catch (error) {
    handleError(res, error, 'Could not load held bills.');
  }
});

// POST /api/held-bills
// Puts the current bill on hold. Body: { label, bill, itemCount, total }
router.post('/', async (req, res) => {
  try {
    const { label, bill, itemCount, total } = req.body;
    if (!bill || !Array.isArray(bill.items) || bill.items.length === 0) {
      return res.status(400).json({ message: 'There is nothing on the bill to hold.' });
    }

    const held = await HeldBill.create({
      label: label || '',
      bill,
      itemCount: Number(itemCount) || bill.items.length,
      total: Number(total) || 0,
      heldBy: req.user._id,
      heldByName: req.user.name,
    });
    res.status(201).json(held);
  } catch (error) {
    handleError(res, error, 'Could not hold the bill.');
  }
});

// DELETE /api/held-bills/:id
// Removes a held bill (after it is recalled, or if it is no longer needed).
router.delete('/:id', async (req, res) => {
  try {
    const held = await HeldBill.findByIdAndDelete(req.params.id);
    if (!held) {
      return res.status(404).json({ message: 'That held bill was already recalled on another till.' });
    }
    res.json(held);
  } catch (error) {
    handleError(res, error, 'Could not remove the held bill.');
  }
});

module.exports = router;
