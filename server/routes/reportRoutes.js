const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Return = require('../models/Return');
const { requireLogin } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { lagosDayRange, todayInLagos } = require('../utils/dates');
const { roundMoney } = require('../utils/saleCalculations');

const router = express.Router();

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// Adds up amounts per payment method, e.g. { cash: 5000, transfer: 2000, card: 0 }.
function totalsByMethod(entries) {
  const totals = { cash: 0, transfer: 0, card: 0 };
  entries.forEach(({ method, amount }) => {
    totals[method] = roundMoney(totals[method] + amount);
  });
  return totals;
}

// GET /api/reports/end-of-day?date=YYYY-MM-DD&cashier=<id or "all">
// Summary of one day's sales and refunds by payment method, so the
// cashier can balance the till. Cashiers always see only their own.
router.get('/end-of-day', async (req, res) => {
  try {
    const date = req.query.date || todayInLagos();
    const range = lagosDayRange(date);
    if (!range) {
      return res.status(400).json({ message: 'Choose a valid date.' });
    }

    // Which cashier: cashiers -> themselves; managers/owners -> chosen one or all.
    let cashierId = null;
    if (req.user.role === 'cashier') {
      cashierId = req.user._id;
    } else if (mongoose.isValidObjectId(req.query.cashier)) {
      cashierId = req.query.cashier;
    }

    const when = { createdAt: { $gte: range.start, $lt: range.end } };
    const sales = await Sale.find(cashierId ? { ...when, cashier: cashierId } : when).sort({ createdAt: 1 });
    const returns = await Return.find(cashierId ? { ...when, processedBy: cashierId } : when);

    const salesByMethod = totalsByMethod(sales.flatMap((s) => s.payments));
    const refundsByMethod = totalsByMethod(returns.map((r) => ({ method: r.refundMethod, amount: r.refundTotal })));
    const netByMethod = {};
    Object.keys(salesByMethod).forEach((method) => {
      netByMethod[method] = roundMoney(salesByMethod[method] - refundsByMethod[method]);
    });

    const sum = (list, field) => roundMoney(list.reduce((total, item) => total + item[field], 0));

    // Everyone who sold something that day (for the manager's cashier list).
    const cashiers = await Sale.aggregate([
      { $match: when },
      { $group: { _id: '$cashier', name: { $first: '$cashierName' } } },
      { $sort: { name: 1 } },
    ]);

    res.json({
      date,
      cashiers: cashiers.map((c) => ({ _id: c._id, name: c.name })),
      cashierName: cashierId ? (sales[0]?.cashierName || returns[0]?.processedByName || req.user.name) : 'All cashiers',
      salesCount: sales.length,
      itemsSold: sales.reduce((total, s) => total + s.items.reduce((n, item) => n + item.quantity, 0), 0),
      grossSales: sum(sales, 'subtotal'),
      discounts: sum(sales, 'discountTotal'),
      netSales: sum(sales, 'total'),
      returnsCount: returns.length,
      refunds: sum(returns, 'refundTotal'),
      salesByMethod,
      refundsByMethod,
      netByMethod,
      expectedCash: netByMethod.cash,
      firstReceipt: sales[0]?.receiptNumber || '',
      lastReceipt: sales[sales.length - 1]?.receiptNumber || '',
      generatedAt: new Date(),
    });
  } catch (error) {
    handleError(res, error, 'Could not build the end-of-day report.');
  }
});

module.exports = router;
