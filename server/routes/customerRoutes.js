const express = require('express');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { escapeRegex } = require('../utils/stockHelpers');
const { cleanPhone } = require('../utils/loyalty');

const router = express.Router();
const canManage = requireRole('owner', 'manager');

// Everyone at the till can find and add customers.
router.use(requireLogin);

function pickFields(body) {
  const fields = {};
  ['name', 'phone', 'notes'].forEach((key) => {
    if (body[key] !== undefined) fields[key] = String(body[key]).trim();
  });
  if (fields.phone !== undefined) fields.phone = cleanPhone(fields.phone);
  return fields;
}

function duplicatePhone(res, error) {
  if (error.code === 11000) {
    res.status(400).json({ message: 'Another customer already has that phone number.' });
    return true;
  }
  return false;
}

// GET /api/customers?search=
// Customers A-Z, or those whose name or phone matches the search (at most 50).
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    let filter = {};
    if (search) {
      const digits = cleanPhone(search);
      filter = { $or: [{ name: { $regex: escapeRegex(search), $options: 'i' } }, ...(digits.length >= 3 ? [{ phone: { $regex: escapeRegex(digits) } }] : [])] };
    }
    const customers = await Customer.find(filter).sort({ name: 1 }).limit(search ? 50 : 1000);
    res.json(customers);
  } catch (error) {
    handleError(res, error, 'Could not load customers.');
  }
});

// GET /api/customers/:id  (with their last 20 sales)
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    const sales = await Sale.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(20)
      .select('receiptNumber total pointsEarned pointsRedeemed createdAt');
    res.json({ customer, sales });
  } catch (error) {
    handleError(res, error, 'Could not load the customer.');
  }
});

// POST /api/customers  { name, phone, notes? }
router.post('/', async (req, res) => {
  try {
    res.status(201).json(await Customer.create(pickFields(req.body)));
  } catch (error) {
    if (!duplicatePhone(res, error)) handleError(res, error, 'Could not add the customer.');
  }
});

// PUT /api/customers/:id  { name?, phone?, notes?, points? }  (owner, manager)
router.put('/:id', canManage, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    const fields = pickFields(req.body);
    if (req.body.points !== undefined) {
      const points = Number(req.body.points);
      if (!Number.isInteger(points) || points < 0) return res.status(400).json({ message: 'Points must be a whole number, 0 or more.' });
      fields.points = points;
    }
    customer.set(fields);
    await customer.save();
    res.json(customer);
  } catch (error) {
    if (!duplicatePhone(res, error)) handleError(res, error, 'Could not save the customer.');
  }
});

// DELETE /api/customers/:id  (owner, manager). Their sales are kept.
router.delete('/:id', canManage, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    res.json({ message: `${customer.name} deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete the customer.');
  }
});

module.exports = router;
