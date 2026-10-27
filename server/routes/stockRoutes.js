const express = require('express');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { logStockMovement } = require('../utils/stockHelpers');

const router = express.Router();

// Only owners and managers can change stock levels here.
router.use(requireLogin, requireRole('owner', 'manager'));

// POST /api/stock/receive
// Adds delivered stock to a product.
// Body: { productId, quantity, supplierId?, costPrice?, note? }
router.post('/receive', async (req, res) => {
  try {
    const { productId, supplierId, note } = req.body;
    const quantity = Number(req.body.quantity);
    const costPrice = req.body.costPrice === '' || req.body.costPrice == null ? null : Number(req.body.costPrice);

    if (!productId) {
      return res.status(400).json({ message: 'Choose a product.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a whole number above 0.' });
    }
    if (costPrice !== null && (Number.isNaN(costPrice) || costPrice < 0)) {
      return res.status(400).json({ message: 'Cost price must be 0 or more.' });
    }

    // $inc adds to the quantity in one step, so two people receiving
    // stock at the same time cannot overwrite each other.
    const update = { $inc: { quantity } };
    if (costPrice !== null) update.$set = { costPrice };

    const product = await Product.findByIdAndUpdate(productId, update, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await logStockMovement({
      product, type: 'receive', change: quantity, user: req.user,
      supplier: supplierId || null, costPrice, note,
    });

    res.json({ message: `Added ${quantity} to ${product.name}. New stock: ${product.quantity}.`, product });
  } catch (error) {
    handleError(res, error, 'Could not receive stock.');
  }
});

// POST /api/stock/count
// Saves the results of a stock count: each product's quantity is set
// to what was counted on the shelf.
// Body: { counts: [{ productId, countedQuantity }] }
router.post('/count', async (req, res) => {
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
    const movements = await StockMovement.find(filter)
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(movements);
  } catch (error) {
    handleError(res, error, 'Could not load stock history.');
  }
});

module.exports = router;
