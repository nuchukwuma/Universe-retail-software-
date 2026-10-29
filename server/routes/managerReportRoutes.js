const express = require('express');
const Product = require('../models/Product');
const { requireLogin, requireRole } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { todayInLagos, createdAtFilter, addDays, daysBetween, mondayOf } = require('../utils/dates');
const { roundMoney } = require('../utils/saleCalculations');
const { dailySales, weeklySales, salesByCashier, salesSummary, productSales, addRows } = require('../utils/reportQueries');

const router = express.Router();

// Reports are for managers and owners.
router.use(requireLogin, requireRole('owner', 'manager'));

// How many low-stock products the Today page lists.
const LOW_STOCK_LIST_SIZE = 10;
const IS_LOW = { $expr: { $lte: ['$quantity', '$reorderLevel'] } };

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

// The part of a date range that is sent back to the app.
function rangeInfo(range) {
  return { from: range.from, to: range.to, days: range.days };
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

// GET /api/reports/dashboard
// The numbers for the Today page: today, yesterday, this week, this month,
// and the products running low.
router.get('/dashboard', async (req, res) => {
  try {
    const today = todayInLagos();
    const weekStart = mondayOf(today);
    const [todayTotals, yesterdayTotals, weekTotals, monthTotals, lowStock, lowStockProducts] = await Promise.all([
      salesSummary(createdAtFilter(today, today)),
      salesSummary(createdAtFilter(addDays(today, -1), addDays(today, -1))),
      salesSummary(createdAtFilter(weekStart, today)),
      salesSummary(createdAtFilter(`${today.slice(0, 8)}01`, today)),
      Product.countDocuments(IS_LOW),
      Product.find(IS_LOW).sort({ quantity: 1, name: 1 }).limit(LOW_STOCK_LIST_SIZE).select('name barcode quantity reorderLevel'),
    ]);
    res.json({
      today: todayTotals,
      yesterday: yesterdayTotals,
      week: weekTotals,
      weekStart,
      month: monthTotals,
      lowStock,
      lowStockProducts,
    });
  } catch (error) {
    handleError(res, error, 'Could not load the Today page.');
  }
});

// GET /api/reports/daily-sales?from=&to=
// One row per day: sales, items, discounts, refunds and takings.
router.get('/daily-sales', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    const rows = await dailySales(range.createdAt);
    res.json({ ...rangeInfo(range), rows, totals: addRows(rows) });
  } catch (error) {
    handleError(res, error, 'Could not build the daily sales report.');
  }
});

// GET /api/reports/weekly-sales?from=&to=
// One row per week (Monday to Sunday).
router.get('/weekly-sales', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    const rows = await weeklySales(range.createdAt);
    res.json({ ...rangeInfo(range), rows, totals: addRows(rows) });
  } catch (error) {
    handleError(res, error, 'Could not build the weekly sales report.');
  }
});

// GET /api/reports/cashiers?from=&to=
// One row per cashier: number of sales, money taken, discounts given.
router.get('/cashiers', async (req, res) => {
  try {
    const range = readDateRange(req);
    if (!range) return badDates(res);
    const rows = await salesByCashier(range.createdAt);
    res.json({ ...rangeInfo(range), rows, totals: addRows(rows) });
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
    const totals = {
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      revenue: roundMoney(rows.reduce((sum, row) => sum + row.revenue, 0)),
    };
    res.json({ ...rangeInfo(range), rows, totals });
  } catch (error) {
    handleError(res, error, 'Could not build the best-selling products report.');
  }
});

// GET /api/reports/stock-levels?from=&to=
// Every product's stock now, its value at selling price, and how fast it
// sold in the dates chosen.
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
      let status = 'In stock';
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
        sellingPrice: p.sellingPrice,
        stockValue: roundMoney(Math.max(p.quantity, 0) * p.sellingPrice),
        soldInPeriod,
        // At the speed it sold, roughly how many days until it runs out.
        daysLeft: perDay > 0 ? Math.floor(Math.max(p.quantity, 0) / perDay) : null,
      };
    });

    const totals = {
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      stockValue: roundMoney(rows.reduce((sum, row) => sum + row.stockValue, 0)),
      soldInPeriod: rows.reduce((sum, row) => sum + row.soldInPeriod, 0),
      lowCount: rows.filter((r) => r.status === 'Low').length,
      outCount: rows.filter((r) => r.status === 'Out of stock').length,
    };
    res.json({ ...rangeInfo(range), rows, totals });
  } catch (error) {
    handleError(res, error, 'Could not build the stock levels report.');
  }
});

module.exports = router;
