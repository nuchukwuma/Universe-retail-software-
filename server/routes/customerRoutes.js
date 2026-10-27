const express = require('express');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { escapeRegex } = require('../utils/stockHelpers');

const router = express.Router();
const canManage = requireRole('owner', 'manager');

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// Adds totalSpent, visits and lastVisit to each customer in the list,
// worked out from their sales.
async function addPurchaseStats(customers) {
  const stats = await Sale.aggregate([
    { $match: { customer: { $in: customers.map((c) => c._id) } } },
    {
      $group: {
        _id: '$customer',
        totalSpent: { $sum: '$total' },
        visits: { $sum: 1 },
        lastVisit: { $max: '$createdAt' },
      },
    },
  ]);

  const statsById = {};
  stats.forEach((s) => {
    statsById[String(s._id)] = s;
  });

  return customers.map((c) => {
    const s = statsById[String(c._id)] || {};
    return { ...c, totalSpent: s.totalSpent || 0, visits: s.visits || 0, lastVisit: s.lastVisit || null };
  });
}

// GET /api/customers?search=ada
// Finds customers by name or phone. Without a search, lists the newest 100.
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = search
      ? { $or: [{ name: new RegExp(escapeRegex(search), 'i') }, { phone: new RegExp(escapeRegex(search)) }] }
      : {};

    const customers = await Customer.find(filter).sort({ name: 1 }).limit(search ? 30 : 100).lean();
    res.json(await addPurchaseStats(customers));
  } catch (error) {
    handleError(res, error, 'Could not load customers.');
  }
});

// POST /api/customers
// Adds a new customer (cashiers can do this at the till).
router.post('/', async (req, res) => {
  try {
    const customer = await Customer.create({ name: req.body.name, phone: req.body.phone });
    res.status(201).json(customer);
  } catch (error) {
    handleError(res, error, 'Could not add customer.');
  }
});

// GET /api/customers/:id/sales
// Returns a customer's purchase history, newest first.
router.get('/:id/sales', canManage, async (req, res) => {
  try {
    const sales = await Sale.find({ customer: req.params.id }).sort({ createdAt: -1 }).limit(200);
    res.json(sales);
  } catch (error) {
    handleError(res, error, 'Could not load purchase history.');
  }
});

// PUT /api/customers/:id
// Changes a customer's name or phone (owner/manager).
router.put('/:id', canManage, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    if (req.body.name !== undefined) customer.name = req.body.name;
    if (req.body.phone !== undefined) customer.phone = req.body.phone;
    await customer.save();
    res.json(customer);
  } catch (error) {
    handleError(res, error, 'Could not update customer.');
  }
});

// DELETE /api/customers/:id
// Deletes a customer. Their old receipts keep the customer's name.
router.delete('/:id', canManage, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }
    res.json({ message: `${customer.name} was deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete customer.');
  }
});

module.exports = router;
