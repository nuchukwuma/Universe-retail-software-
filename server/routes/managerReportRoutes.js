const express = require('express');
const Product = require('../models/Product');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { todayInLagos, createdAtFilter, addDays, daysBetween } = require('../utils/dates');
const { expiryWarningDate } = require('../utils/stockHelpers');
const { roundMoney } = require('../utils/saleCalculations');
const { dailySales, salesByCashier, salesSummary, productSales } = require('../utils/reportQueries');

const router = express.Router();

// Reports show profit, so only managers and owners can see them.
router.use(requireLogin, requireRole('owner', 'manager'));

// Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD from the address (default: today)
// and returns the matching database filter. Returns null if the dates are wrong.
function readDateRange(req) {
  const today = todayInLagos();
  const from = req.query.from || today;
  const to = req.query.to || today;
  const createdAt = createdAtFilter(from, to);
  if (!createdAt || from > to) return null;
  return { from, to, createdAt, days: daysBetween(from, to) };
}

// Sends the "wrong dates" reply.
function badDates(res) {
  return res.status(400).json({ message: 'Choose a valid date range (the "from" date must be before the "to" date).' });
}

// Adds each product's category name to the product sales rows.
async function addCategories(rows) {
  const products = await Product.find({ _id: { $in: rows.map((r) => r.product) } }).populate('category', 'name');
  const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));
  return rows.map((row) => {
    const product = byId[String(row.product)];
    return {
      ...row,
      categoryId: product?.category?._id || null,
      category: product ? product.category?.name || 'No category' : 'Deleted product',
    };
  });
}

// Adds up a list of rows, field by field (for the "Total" line under a table).
function sumRows(rows, fields) {
  const totals = {};
  fields.forEach((field) => {
    totals[field] = roundMoney(rows.reduce((sum, row) => sum + (row[field] || 0), 0));
  });
  return totals;
}

const MONEY_FIELDS = ['grossSales', 'discounts', 'netSales', 'refunds', 'cost', 'profit', 'cash', 'transfer', 'card'];

// GET /api/reports/dashboard
// The numbers for the dashboard cards: today, yesterday and this month so far.
router.get('/dashboard', async (req, res) => {
  try {
    const today = todayInLagos();
    const [todayTotals, yesterdayTotals, monthTotals, lowStock, expiring] = await Promise.all([
      salesSummary(createdAtFilter(today, today)),
      salesSummary(createdAtFilter(addDays(today, -1), addDays(today, -1))),
      salesSummary(createdAtFilter(`${today.slice(0, 8)}01`, today)),
      Product.countDocuments({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }),
      Product.countDocuments({ expiryDate: { $ne: null, $lte: expiryWarningDate() } }),
    ]);
    res.json({ today: todayTotals, yesterday: yesterdayTotals, month: monthTotals, lowStock, expiring });
  } catch (error) {
    handleError(res, error, 'Could not load the dashboard.');
  }
});

// GET /api/reports/daily-sales?from=&to=
// One row per day with sales, discounts, refunds, payment methods and profit.
router.get('/daily-sales', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    const rows = await dailySales(range.createdAt);
    const totals = { ...sumRows(rows, [...MONEY_FIELDS, 'transactions', 'itemsSold']) };
    totals.averageSale = totals.transactions ? Math.round(totals.netSales / totals.transactions) : 0;
    res.json({ ...range, createdAt: undefined, rows, totals });
  } catch (error) {
    handleError(res, error, 'Could not build the daily sales report.');
  }
});

// GET /api/reports/cashiers?from=&to=
// One row per cashier: number of sales, money taken, discounts given, profit.
router.get('/cashiers', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    const rows = await salesByCashier(range.createdAt);
    const totals = sumRows(rows, [...MONEY_FIELDS, 'transactions', 'itemsSold']);
    totals.averageSale = totals.transactions ? Math.round(totals.netSales / totals.transactions) : 0;
    res.json({ ...range, createdAt: undefined, rows, totals });
  } catch (error) {
    handleError(res, error, 'Could not build the cashier report.');
  }
});

// GET /api/reports/best-sellers?from=&to=&category=<id>
// Products ranked by quantity sold (returns taken off).
router.get('/best-sellers', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    let rows = await addCategories(await productSales(range.createdAt));
    if (req.query.category) {
      rows = rows.filter((row) => String(row.categoryId) === req.query.category);
    }
    rows = rows.map((row, index) => ({ rank: index + 1, ...row }));
    res.json({ ...range, createdAt: undefined, rows, totals: sumRows(rows, ['quantity', 'revenue', 'cost', 'profit']) });
  } catch (error) {
    handleError(res, error, 'Could not build the best-selling products report.');
  }
});

// GET /api/reports/profit?from=&to=
// Profit by category, plus the most profitable products.
router.get('/profit', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    const products = await addCategories(await productSales(range.createdAt));

    // Add the products up category by category.
    const byCategory = {};
    products.forEach((p) => {
      const row = byCategory[p.category] || { category: p.category, quantity: 0, revenue: 0, cost: 0 };
      row.quantity += p.quantity;
      row.revenue += p.revenue;
      row.cost += p.cost;
      byCategory[p.category] = row;
    });
    const rows = Object.values(byCategory)
      .map((row) => {
        const revenue = roundMoney(row.revenue);
        const cost = roundMoney(row.cost);
        const profit = roundMoney(revenue - cost);
        return { ...row, revenue, cost, profit, margin: revenue > 0 ? roundMoney((profit / revenue) * 100) : 0 };
      })
      .sort((a, b) => b.profit - a.profit);

    const totals = sumRows(rows, ['quantity', 'revenue', 'cost', 'profit']);
    totals.margin = totals.revenue > 0 ? roundMoney((totals.profit / totals.revenue) * 100) : 0;
    const topProducts = [...products].sort((a, b) => b.profit - a.profit).slice(0, 10);

    res.json({ ...range, createdAt: undefined, rows, totals, topProducts });
  } catch (error) {
    handleError(res, error, 'Could not build the profit report.');
  }
});

// GET /api/reports/stock-levels?from=&to=
// Every product's stock now, its value, and how fast it sold in the dates chosen.
router.get('/stock-levels', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);

    const [products, sold] = await Promise.all([
      Product.find().populate('category', 'name').sort({ name: 1 }),
      productSales(range.createdAt),
    ]);
    const soldById = Object.fromEntries(sold.map((s) => [String(s.product), s.quantity]));

    const rows = products.map((p) => {
      const soldInPeriod = soldById[String(p._id)] || 0;
      const perDay = soldInPeriod / range.days;
      let status = 'OK';
      if (p.quantity <= 0) status = 'Out of stock';
      else if (p.quantity <= p.reorderLevel) status = 'Low';

      return {
        product: p._id,
        name: p.name,
        barcode: p.barcode || '',
        category: p.category?.name || 'No category',
        quantity: p.quantity,
        reorderLevel: p.reorderLevel,
        status,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        costValue: roundMoney(Math.max(p.quantity, 0) * p.costPrice),
        retailValue: roundMoney(Math.max(p.quantity, 0) * p.sellingPrice),
        soldInPeriod,
        // At the speed it sold, roughly how many days until it runs out.
        daysLeft: perDay > 0 ? Math.floor(Math.max(p.quantity, 0) / perDay) : null,
        expiryDate: p.expiryDate,
      };
    });

    const totals = sumRows(rows, ['quantity', 'costValue', 'retailValue', 'soldInPeriod']);
    totals.lowCount = rows.filter((r) => r.status === 'Low').length;
    totals.outCount = rows.filter((r) => r.status === 'Out of stock').length;
    res.json({ ...range, createdAt: undefined, rows, totals });
  } catch (error) {
    handleError(res, error, 'Could not build the stock levels report.');
  }
});

module.exports = router;
