const express = require('express');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { nextPurchaseNumber } = require('../utils/counters');
const { logStockMovement } = require('../utils/stockHelpers');
const { roundMoney } = require('../utils/saleCalculations');
const { isValidId } = require('../db');

const router = express.Router();

// Purchases are for owners and managers.
router.use(requireLogin, requireRole('owner', 'manager'));

// A problem with what was sent (shown to the user as it is).
class PurchaseError extends Error {}

// Checks the products on an order and works out each line.
// requestItems: [{ productId, quantity, unitCost }]
async function buildItems(requestItems) {
  if (!Array.isArray(requestItems) || requestItems.length === 0) throw new PurchaseError('Add at least one product to the order.');
  const ids = requestItems.map((line) => line.productId).filter(isValidId);
  const products = await Product.find({ _id: { $in: ids } });
  return requestItems.map((line) => {
    const product = products.find((p) => String(p._id) === String(line.productId));
    if (!product) throw new PurchaseError('A product on the order no longer exists. Remove it and try again.');
    const quantity = Number(line.quantity);
    // The cost is optional (empty = 0, "not known").
    const noCost = line.unitCost === undefined || line.unitCost === null || line.unitCost === '';
    const unitCost = noCost ? 0 : Number(line.unitCost);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new PurchaseError(`Quantity for ${product.name} must be a whole number above 0.`);
    if (!Number.isFinite(unitCost) || unitCost < 0) throw new PurchaseError(`The cost of one ${product.name} must be a number, 0 or more.`);
    return { product: product._id, name: product.name, quantity, unitCost, receivedQuantity: 0, lineTotal: roundMoney(quantity * unitCost) };
  });
}

// Finds the supplier for an order, or explains what is wrong.
async function findSupplier(supplierId) {
  const supplier = isValidId(supplierId) ? await Supplier.findById(supplierId) : null;
  if (!supplier) throw new PurchaseError('Choose a supplier.');
  return supplier;
}

// Sends a PurchaseError as a 400, anything else as a server error.
function sendError(res, error, fallback) {
  if (error instanceof PurchaseError) return res.status(400).json({ message: error.message });
  return handleError(res, error, fallback);
}

// GET /api/purchases?status=ordered&supplier=<id>
// Purchase orders, newest first.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    if (isValidId(req.query.supplier)) filter.supplier = req.query.supplier;
    res.json(await Purchase.find(filter).sort({ createdAt: -1 }).limit(300));
  } catch (error) {
    handleError(res, error, 'Could not load the purchase orders.');
  }
});

// GET /api/purchases/:id
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase order not found.' });
    res.json(purchase);
  } catch (error) {
    handleError(res, error, 'Could not load the purchase order.');
  }
});

// POST /api/purchases
// Body: { supplierId, items: [{ productId, quantity, unitCost }], expectedDate?, notes? }
router.post('/', async (req, res) => {
  try {
    const supplier = await findSupplier(req.body.supplierId);
    const items = await buildItems(req.body.items);
    const purchase = await Purchase.create({
      purchaseNumber: await nextPurchaseNumber(),
      supplier: supplier._id,
      supplierName: supplier.name,
      items,
      total: roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0)),
      expectedDate: req.body.expectedDate || null,
      notes: req.body.notes || '',
      createdBy: req.user._id,
      createdByName: req.user.name,
    });
    res.status(201).json(purchase);
  } catch (error) {
    sendError(res, error, 'Could not save the purchase order.');
  }
});

// PUT /api/purchases/:id
// Changes an order that has not been received yet. Same body as POST.
router.put('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase order not found.' });
    if (purchase.status !== 'ordered') throw new PurchaseError('Only an order that has not been received can be changed.');
    const supplier = await findSupplier(req.body.supplierId || purchase.supplier);
    const items = req.body.items ? await buildItems(req.body.items) : purchase.items;
    purchase.set({
      supplier: supplier._id,
      supplierName: supplier.name,
      items,
      total: roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0)),
      expectedDate: req.body.expectedDate !== undefined ? req.body.expectedDate || null : purchase.expectedDate,
      notes: req.body.notes !== undefined ? req.body.notes : purchase.notes,
    });
    await purchase.save();
    res.json(purchase);
  } catch (error) {
    sendError(res, error, 'Could not save the purchase order.');
  }
});

// POST /api/purchases/:id/receive
// Adds the delivered stock and sets each product's cost price.
// Body: { items?: [{ lineIndex, quantity, unitCost? }] }  (none = everything still to come)
router.post('/:id/receive', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase order not found.' });
    if (!['ordered', 'part_received'].includes(purchase.status)) throw new PurchaseError('This order is already closed.');

    const outstanding = (line) => line.quantity - (line.receivedQuantity || 0);
    const requested = Array.isArray(req.body.items) && req.body.items.length
      ? req.body.items
      : purchase.items.map((line, lineIndex) => ({ lineIndex, quantity: outstanding(line) }));

    // Check everything first, so nothing is half received.
    const deliveries = requested
      .map((entry) => ({ ...entry, line: purchase.items[entry.lineIndex], quantity: Number(entry.quantity) }))
      .filter((entry) => entry.quantity > 0);
    if (deliveries.length === 0) throw new PurchaseError('Enter how many of each product arrived.');
    for (const entry of deliveries) {
      if (!entry.line) throw new PurchaseError('A line on this order was not found.');
      if (!Number.isInteger(entry.quantity) || entry.quantity > outstanding(entry.line)) {
        throw new PurchaseError(`${entry.line.name}: at most ${outstanding(entry.line)} more can be received.`);
      }
      if (entry.unitCost !== undefined && (!Number.isFinite(Number(entry.unitCost)) || Number(entry.unitCost) < 0)) {
        throw new PurchaseError(`Enter the cost of one ${entry.line.name}.`);
      }
    }

    for (const entry of deliveries) {
      // An empty or 0 cost means "not given": the line keeps its own cost.
      const unitCost = Number(entry.unitCost) > 0 ? Number(entry.unitCost) : entry.line.unitCost;
      // A cost of 0 means "not known": the product keeps the cost price it has.
      const change = { $inc: { quantity: entry.quantity } };
      if (unitCost > 0) change.$set = { costPrice: unitCost };
      const product = await Product.findByIdAndUpdate(entry.line.product, change, { new: true });
      entry.line.receivedQuantity = (entry.line.receivedQuantity || 0) + entry.quantity;
      entry.line.unitCost = unitCost;
      entry.line.lineTotal = roundMoney(entry.line.quantity * unitCost);
      if (product) {
        if (!product.supplier) await Product.findByIdAndUpdate(product._id, { supplier: purchase.supplier });
        await logStockMovement({
          product, type: 'receive', change: entry.quantity, user: req.user,
          note: `Purchase ${purchase.purchaseNumber}`, unitCost, supplier: purchase.supplier, purchase: purchase._id,
        });
      }
    }

    const allIn = purchase.items.every((line) => outstanding(line) <= 0);
    purchase.status = allIn ? 'received' : 'part_received';
    if (allIn) purchase.receivedAt = new Date();
    purchase.total = roundMoney(purchase.items.reduce((sum, line) => sum + line.lineTotal, 0));
    await purchase.save();
    const count = deliveries.reduce((sum, entry) => sum + entry.quantity, 0);
    res.json({ message: `${count} item${count === 1 ? '' : 's'} received into stock.`, purchase });
  } catch (error) {
    sendError(res, error, 'Could not receive the order.');
  }
});

// POST /api/purchases/:id/cancel
// Cancels an order nothing has been received on yet.
router.post('/:id/cancel', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase order not found.' });
    if (purchase.status !== 'ordered') throw new PurchaseError('Only an order with nothing received can be cancelled.');
    purchase.status = 'cancelled';
    await purchase.save();
    res.json({ message: `${purchase.purchaseNumber} cancelled.`, purchase });
  } catch (error) {
    sendError(res, error, 'Could not cancel the order.');
  }
});

module.exports = router;
