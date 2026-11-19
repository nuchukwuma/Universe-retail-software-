const express = require('express');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { requireLicence } = require('../utils/licence');
const { logStockMovement } = require('../utils/stockHelpers');
const { isValidId } = require('../db');

const router = express.Router();

// Only owners and managers can change stock levels here.
router.use(requireLogin, requireRole('owner', 'manager'));

// POST /api/stock/receive
// Adds delivered stock to a product. If the cost of one is given, it
// becomes the product's cost price (for profit).
// Body: { productId, quantity, unitCost?, supplierId?, note? }
router.post('/receive', requireLicence, async (req, res) => {
  try {
    const { productId, note } = req.body;
    const quantity = Number(req.body.quantity);

    if (!productId) {
      return res.status(400).json({ message: 'Choose a product.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a whole number above 0.' });
    }
    const hasCost = req.body.unitCost !== undefined && req.body.unitCost !== null && req.body.unitCost !== '';
    const unitCost = hasCost ? Number(req.body.unitCost) : null;
    if (hasCost && (!Number.isFinite(unitCost) || unitCost < 0)) {
      return res.status(400).json({ message: 'The cost must be a number, 0 or more.' });
    }
    const supplier = isValidId(req.body.supplierId) ? req.body.supplierId : null;

    // $inc adds to the quantity in one step, so two people receiving
    // stock at the same time cannot overwrite each other.
    const change = { $inc: { quantity } };
    // A cost of 0 means "not known": the product keeps the cost price it has.
    const setsCost = hasCost && unitCost > 0;
    if (setsCost || supplier) change.$set = { ...(setsCost ? { costPrice: unitCost } : {}), ...(supplier ? { supplier } : {}) };
    const product = await Product.findByIdAndUpdate(productId, change, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await logStockMovement({ product, type: 'receive', change: quantity, user: req.user, note, unitCost, supplier });

    res.json({ message: `Added ${quantity} to ${product.name}. New stock: ${product.quantity}.`, product });
  } catch (error) {
    handleError(res, error, 'Could not receive stock.');
  }
});

// POST /api/stock/count
// Saves the results of a stock count: each product's quantity is set
// to what was counted on the shelf.
// Body: { counts: [{ productId, countedQuantity }] }
router.post('/count', requireLicence, async (req, res) => {
  try {
    const counts = Array.isArray(req.body.counts) ? req.body.counts : [];
    if (counts.length === 0) {
      return res.status(400).json({ message: 'Nothing was counted.' });
    }

    let changedCount = 0;

    for (const item of counts) {
      const counted = Number(item.countedQuantity);
      if (!Number.isInteger(counted) || counted < 0) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      const change = counted - product.quantity;
      if (change === 0) continue;

      product.quantity = counted;
      await product.save();
      await logStockMovement({ product, type: 'count', change, user: req.user, note: 'Stock count' });
      changedCount += 1;
    }

    res.json({ message: `Stock count saved. ${changedCount} product(s) were corrected.` });
  } catch (error) {
    handleError(res, error, 'Could not save stock count.');
  }
});

// GET /api/stock/movements?type=receive&limit=50
// Lists recent stock movements, newest first.
router.get('/movements', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.product) filter.product = req.query.product;

    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const movements = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(limit);

    res.json(movements);
  } catch (error) {
    handleError(res, error, 'Could not load stock history.');
  }
});

module.exports = router;
