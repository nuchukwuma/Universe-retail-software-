const express = require('express');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { expiryWarningDate, logStockMovement } = require('../utils/stockHelpers');

const router = express.Router();
const canManage = requireRole('owner', 'manager');

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// Cashiers must not see cost prices (they would reveal the profit).
// Returns a copy of the product with costPrice removed for cashiers.
function hideCostForCashier(product, user) {
  const plain = product.toObject ? product.toObject() : { ...product };
  if (user.role === 'cashier') delete plain.costPrice;
  return plain;
}

// Copies only the allowed product fields from the request body,
// and turns empty boxes into "no value".
function pickProductFields(body) {
  const fields = {};
  const allowed = [
    'name', 'barcode', 'category', 'image', 'costPrice', 'sellingPrice',
    'wholesalePrice', 'quantity', 'reorderLevel', 'expiryDate',
  ];

  allowed.forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });

  if (fields.category === '') fields.category = null;
  if (fields.expiryDate === '') fields.expiryDate = null;
  if (typeof fields.barcode === 'string') fields.barcode = fields.barcode.trim();
  return fields;
}

// GET /api/products
// Lists every product A-Z with its category name and icon.
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name icon').sort({ name: 1 });
    res.json(products.map((p) => hideCostForCashier(p, req.user)));
  } catch (error) {
    handleError(res, error, 'Could not load products.');
  }
});

// GET /api/products/alerts
// Returns products that are low on stock and products expiring soon.
router.get('/alerts', canManage, async (req, res) => {
  try {
    const lowStock = await Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } })
      .populate('category', 'name icon')
      .sort({ quantity: 1 });

    const expiring = await Product.find({ expiryDate: { $ne: null, $lte: expiryWarningDate() } })
      .populate('category', 'name icon')
      .sort({ expiryDate: 1 });

    res.json({ lowStock, expiring });
  } catch (error) {
    handleError(res, error, 'Could not load stock alerts.');
  }
});

// GET /api/products/barcode/:code
// Finds one product by its barcode (used by scanners).
router.get('/barcode/:code', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.code.trim() }).populate('category', 'name icon');
    if (!product) {
      return res.status(404).json({ message: `No product has the barcode ${req.params.code}.` });
    }
    res.json(hideCostForCashier(product, req.user));
  } catch (error) {
    handleError(res, error, 'Could not look up barcode.');
  }
});

// GET /api/products/:id
// Returns one product.
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name icon');
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(hideCostForCashier(product, req.user));
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

    await product.populate('category', 'name icon');
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

    await product.populate('category', 'name icon');
    res.json(product);
  } catch (error) {
    handleError(res, error, 'Could not update product.');
  }
});

// DELETE /api/products/:id
// Deletes a product and removes it from any supplier's product list.
router.delete('/:id', canManage, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await Supplier.updateMany({}, { $pull: { products: product._id } });
    res.json({ message: `${product.name} was deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete product.');
  }
});

module.exports = router;
