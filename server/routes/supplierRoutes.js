const express = require('express');
const Supplier = require('../models/Supplier');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');

const router = express.Router();

// Only owners and managers can see or change suppliers.
router.use(requireLogin, requireRole('owner', 'manager'));

// Copies only the allowed supplier fields from the request body.
function pickSupplierFields(body) {
  const { name, phone, address, notes, products } = body;
  return { name, phone, address, notes, products };
}

// GET /api/suppliers
// Lists all suppliers A-Z with the names of the products they supply.
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find().populate('products', 'name').sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    handleError(res, error, 'Could not load suppliers.');
  }
});

// POST /api/suppliers
// Adds a new supplier.
router.post('/', async (req, res) => {
  try {
    const supplier = await Supplier.create(pickSupplierFields(req.body));
    await supplier.populate('products', 'name');
    res.status(201).json(supplier);
  } catch (error) {
    handleError(res, error, 'Could not create supplier.');
  }
});

// PUT /api/suppliers/:id
// Updates a supplier's details or product list.
router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const fields = pickSupplierFields(req.body);
    Object.keys(fields).forEach((key) => {
      if (fields[key] !== undefined) supplier[key] = fields[key];
    });

    await supplier.save();
    await supplier.populate('products', 'name');
    res.json(supplier);
  } catch (error) {
    handleError(res, error, 'Could not update supplier.');
  }
});

// DELETE /api/suppliers/:id
// Deletes a supplier.
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }
    res.json({ message: `${supplier.name} was deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete supplier.');
  }
});

module.exports = router;
