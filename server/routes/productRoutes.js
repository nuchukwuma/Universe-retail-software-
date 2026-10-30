const express = require('express');
const Product = require('../models/Product');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { logStockMovement } = require('../utils/stockHelpers');

const router = express.Router();
const canManage = requireRole('owner', 'manager');

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// Copies only the allowed product fields from the request body,
// and turns empty boxes into "no value".
function pickProductFields(body) {
  const fields = {};
  const allowed = ['name', 'barcode', 'category', 'sellingPrice', 'quantity', 'reorderLevel'];

  allowed.forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });

  if (fields.category === '') fields.category = null;
  if (typeof fields.barcode === 'string') fields.barcode = fields.barcode.trim();
  return fields;
}

// GET /api/products
// Lists every product A-Z with its category name.
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name').sort({ name: 1 });
    res.json(products);
  } catch (error) {
    handleError(res, error, 'Could not load products.');
  }
});

// GET /api/products/barcode/:code
// Finds one product by its barcode (used by scanners).
router.get('/barcode/:code', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.code.trim() }).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ message: `Product not found: no product has the barcode ${req.params.code}.` });
    }
    res.json(product);
  } catch (error) {
    handleError(res, error, 'Could not look up barcode.');
  }
});

// GET /api/products/:id
// Returns one product.
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(product);
  } catch (error) {
    handleError(res, error, 'Could not load product.');
  }
});

// POST /api/products
// Creates a new product (owner/manager).
router.post('/', canManage, async (req, res) => {
  try {
    const product = new Product(pickProductFields(req.body));
    await product.save();

    if (product.quantity !== 0) {
      await logStockMovement({
        product, type: 'adjust', change: product.quantity, user: req.user, note: 'Opening stock',
      });
    }

    await product.populate('category', 'name');
    res.status(201).json(product);
  } catch (error) {
    handleError(res, error, 'Could not create product.');
  }
});

// PUT /api/products/:id
// Updates a product (owner/manager). A change of quantity is logged.
router.put('/:id', canManage, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const oldQuantity = product.quantity;
    product.set(pickProductFields(req.body));
    await product.save();

    const change = product.quantity - oldQuantity;
    if (change !== 0) {
      await logStockMovement({
        product, type: 'adjust', change, user: req.user, note: 'Edited on product page',
      });
    }

    await product.populate('category', 'name');
    res.json(product);
  } catch (error) {
    handleError(res, error, 'Could not update product.');
  }
});

// DELETE /api/products/:id
// Deletes a product. (Old sales keep the product's name.)
router.delete('/:id', canManage, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ message: `${product.name} was deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete product.');
  }
});

module.exports = router;
