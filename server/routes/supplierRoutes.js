const express = require('express');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');

const router = express.Router();

// Suppliers are for owners and managers.
router.use(requireLogin, requireRole('owner', 'manager'));

// Keeps only the fields a supplier can have.
function pickSupplierFields(body) {
  const fields = {};
  ['name', 'phone', 'email', 'address', 'notes'].forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });
  return fields;
}

// GET /api/suppliers
// Every supplier A-Z, with how many products and open orders each has.
router.get('/', async (req, res) => {
  try {
    const [suppliers, products, purchases] = await Promise.all([
      Supplier.find().sort({ name: 1 }).lean(),
      Product.aggregate([{ $group: { _id: '$supplier', count: { $sum: 1 } } }]),
      Purchase.aggregate([{ $match: { status: { $in: ['ordered', 'part_received'] } } }, { $group: { _id: '$supplier', count: { $sum: 1 } } }]),
    ]);
    const countFor = (rows, id) => rows.find((row) => String(row._id) === String(id))?.count || 0;
    res.json(suppliers.map((s) => ({ ...s, productCount: countFor(products, s._id), openOrders: countFor(purchases, s._id) })));
  } catch (error) {
    handleError(res, error, 'Could not load the suppliers.');
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    res.status(201).json(await Supplier.create(pickSupplierFields(req.body)));
  } catch (error) {
    handleError(res, error, 'Could not save the supplier.');
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    supplier.set(pickSupplierFields(req.body));
    await supplier.save();
    res.json(supplier);
  } catch (error) {
    handleError(res, error, 'Could not save the supplier.');
  }
});

// DELETE /api/suppliers/:id
// Not allowed while the supplier has purchase orders (they are history).
// Products from this supplier simply have no supplier afterwards.
router.delete('/:id', async (req, res) => {
  try {
    if (await Purchase.countDocuments({ supplier: req.params.id })) {
      return res.status(400).json({ message: 'This supplier has purchase orders, so it cannot be deleted.' });
    }
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    await Product.updateMany({ supplier: supplier._id }, { supplier: null });
    res.json({ message: `${supplier.name} deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete the supplier.');
  }
});

module.exports = router;
