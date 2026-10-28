const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');

const router = express.Router();
const canManage = requireRole('owner', 'manager');

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// GET /api/categories
// Lists all categories A-Z, with how many products are in each.
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);

    const countById = {};
    counts.forEach((c) => {
      countById[String(c._id)] = c.count;
    });

    res.json(categories.map((cat) => ({ ...cat, productCount: countById[String(cat._id)] || 0 })));
  } catch (error) {
    handleError(res, error, 'Could not load categories.');
  }
});

// POST /api/categories
// Creates a new category (owner/manager).
router.post('/', canManage, async (req, res) => {
  try {
    const category = await Category.create({ name: req.body.name });
    res.status(201).json(category);
  } catch (error) {
    handleError(res, error, 'Could not create category.');
  }
});

// PUT /api/categories/:id
// Renames a category (owner/manager).
router.put('/:id', canManage, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    if (req.body.name !== undefined) category.name = req.body.name;

    await category.save();
    res.json(category);
  } catch (error) {
    handleError(res, error, 'Could not update category.');
  }
});

// DELETE /api/categories/:id
// Deletes a category, but only if no products are using it.
router.delete('/:id', canManage, async (req, res) => {
  try {
    const productsInCategory = await Product.countDocuments({ category: req.params.id });
    if (productsInCategory > 0) {
      return res.status(400).json({
        message: `This category still has ${productsInCategory} product(s). Move or delete them first.`,
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    handleError(res, error, 'Could not delete category.');
  }
});

module.exports = router;
