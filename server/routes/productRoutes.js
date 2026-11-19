const express = require('express');
const Product = require('../models/Product');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { requireLicence } = require('../utils/licence');
const { logStockMovement } = require('../utils/stockHelpers');
const { saveImage, deleteImage } = require('../utils/images');

const router = express.Router();
const canManage = requireRole('owner', 'manager');

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// Copies only the allowed product fields from the request body,
// and turns empty boxes into "no value".
function pickProductFields(body) {
  const fields = {};
  const allowed = ['name', 'barcode', 'category', 'supplier', 'sellingPrice', 'costPrice', 'quantity', 'reorderLevel'];

  allowed.forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });

  if (fields.category === '') fields.category = null;
  if (fields.supplier === '') fields.supplier = null;
  if (fields.costPrice === '') fields.costPrice = 0;
  if (typeof fields.barcode === 'string') fields.barcode = fields.barcode.trim();
  return fields;
}

// Cost prices (and so profit) are for owners and managers: they are
// left out of what a cashier's till receives.
function forViewer(req, productOrList) {
  const hide = (product) => {
    const json = product.toJSON();
    if (req.user.role === 'cashier') delete json.costPrice;
    return json;
  };
  return Array.isArray(productOrList) ? productOrList.map(hide) : hide(productOrList);
}

// GET /api/products
// Lists every product A-Z with its category and supplier names.
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name').populate('supplier', 'name').sort({ name: 1 });
    res.json(forViewer(req, products));
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
    res.json(forViewer(req, product));
  } catch (error) {
    handleError(res, error, 'Could not look up barcode.');
  }
});

// GET /api/products/:id
// Returns one product.
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name').populate('supplier', 'name');
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(forViewer(req, product));
  } catch (error) {
    handleError(res, error, 'Could not load product.');
  }
});

// POST /api/products
// Creates a new product (owner/manager).
router.post('/', requireLicence, canManage, async (req, res) => {
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
router.put('/:id', requireLicence, canManage, async (req, res) => {
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
    deleteImage(product.picture);

    res.json({ message: `${product.name} was deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete product.');
  }
});

// PUT /api/products/:id/picture
// Sets the product's photo (optional). Body: { picture: "data:image/jpeg;base64,..." }
router.put('/:id/picture', canManage, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    let name;
    try {
      name = saveImage(req.body.picture);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    deleteImage(product.picture);
    product.picture = name;
    await product.save();
    await product.populate('category', 'name');
    await product.populate('supplier', 'name');
    res.json(forViewer(req, product));
  } catch (error) {
    handleError(res, error, 'Could not save the picture.');
  }
});

// DELETE /api/products/:id/picture
// Removes the product's photo.
router.delete('/:id/picture', canManage, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    deleteImage(product.picture);
    product.picture = '';
    await product.save();
    await product.populate('category', 'name');
    await product.populate('supplier', 'name');
    res.json(forViewer(req, product));
  } catch (error) {
    handleError(res, error, 'Could not remove the picture.');
  }
});

module.exports = router;
