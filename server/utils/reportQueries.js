// The database queries behind the reports.
// They use "aggregation pipelines" (the MongoDB style, run by the app's own
// database with mingo): a list of steps run one after another
// (filter -> reshape -> group -> sort).
//
// How the numbers are worked out:
//   sales total = what customers paid after discounts (sale.total)
//   refunds     = money given back for returns (counted on the ORIGINAL sale's day)
//   takings     = sales total - refunds

const Sale = require('../models/Sale');
const { roundMoney } = require('./saleCalculations');
const { mondayOf } = require('./dates');

// Lagos time. Nigeria is always UTC+1 (no summer time), and the fixed
// offset is about 25 times quicker to work out than the zone's name.
const TIMEZONE = '+01:00';
const MONEY_FIELDS = ['grossSales', 'discounts', 'netSales', 'refunds', 'costOfGoods'];

// How many of a sale line the customer kept (sold minus returned).
const KEPT = { $subtract: ['$$line.quantity', { $ifNull: ['$$line.returnedQuantity', 0] }] };

// Step that works out the useful numbers for each single sale.
const SALE_NUMBERS_STEP = {
  $project: {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } },
    cashier: 1,
    cashierName: 1,
    subtotal: 1,
    discountTotal: 1,
    total: 1,
    refunds: { $ifNull: ['$refundedTotal', 0] },
    itemsSold: { $sum: '$items.quantity' },
    // What the kept items cost the shop (cost price when sold x kept).
    costOfGoods: { $sum: { $map: { input: '$items', as: 'line', in: { $multiply: [{ $ifNull: ['$$line.costPrice', 0] }, KEPT] } } } },
    // Kept items whose cost was not known (their profit is overstated).
    itemsWithoutCost: { $sum: { $map: { input: '$items', as: 'line', in: { $cond: [{ $gt: [{ $ifNull: ['$$line.costPrice', 0] }, 0] }, 0, KEPT] } } } },
  },
};

// The totals to add up when sales are grouped (by day, by cashier...).
const GROUP_TOTALS = {
  transactions: { $sum: 1 },
  itemsSold: { $sum: '$itemsSold' },
  grossSales: { $sum: '$subtotal' },
  discounts: { $sum: '$discountTotal' },
  netSales: { $sum: '$total' },
  refunds: { $sum: '$refunds' },
  costOfGoods: { $sum: '$costOfGoods' },
  itemsWithoutCost: { $sum: '$itemsWithoutCost' },
};

// Rounds every money field and adds takings, profit and the average sale.
//   takings = sales total - refunds
//   profit  = takings - what the kept items cost the shop
function finishRow(row) {
  const rounded = { ...row };
  MONEY_FIELDS.forEach((key) => {
    rounded[key] = roundMoney(row[key] || 0);
  });
  rounded.transactions = row.transactions || 0;
  rounded.itemsSold = row.itemsSold || 0;
  rounded.itemsWithoutCost = row.itemsWithoutCost || 0;
  rounded.takings = roundMoney(rounded.netSales - rounded.refunds);
  rounded.profit = roundMoney(rounded.takings - rounded.costOfGoods);
  rounded.averageSale = rounded.transactions ? Math.round(rounded.netSales / rounded.transactions) : 0;
  return rounded;
}

// Adds a list of rows together into one total row.
function addRows(rows, extra = {}) {
  const total = { transactions: 0, itemsSold: 0, ...extra };
  MONEY_FIELDS.forEach((key) => {
    total[key] = 0;
  });
  total.itemsWithoutCost = 0;
  rows.forEach((row) => {
    total.transactions += row.transactions;
    total.itemsSold += row.itemsSold;
    total.itemsWithoutCost += row.itemsWithoutCost || 0;
    MONEY_FIELDS.forEach((key) => {
      total[key] += row[key];
    });
  });
  return finishRow(total);
}

// Sales totals for each day in the date filter, oldest day first.
async function dailySales(createdAt) {
  const rows = await Sale.aggregate([
    { $match: { createdAt } },
    SALE_NUMBERS_STEP,
    { $group: { _id: '$day', ...GROUP_TOTALS } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => finishRow({ day: row._id, ...row, _id: undefined }));
}

// Sales totals for each week (Monday to Sunday), oldest first.
// Built from the daily totals.
async function weeklySales(createdAt) {
  const byWeek = new Map();
  (await dailySales(createdAt)).forEach((day) => {
    const weekStart = mondayOf(day.day);
    if (!byWeek.has(weekStart)) byWeek.set(weekStart, []);
    byWeek.get(weekStart).push(day);
  });
  return [...byWeek.entries()].map(([weekStart, days]) => addRows(days, { weekStart }));
}

// Sales totals for each cashier, best seller first.
async function salesByCashier(createdAt) {
  const rows = await Sale.aggregate([
    { $match: { createdAt } },
    SALE_NUMBERS_STEP,
    { $group: { _id: '$cashier', cashierName: { $last: '$cashierName' }, ...GROUP_TOTALS } },
    { $sort: { netSales: -1 } },
  ]);
  return rows.map((row) => finishRow({ ...row, cashier: row._id, _id: undefined }));
}

// One total line for the whole date filter (used on the Today page).
async function salesSummary(createdAt) {
  const [row] = await Sale.aggregate([
    { $match: { createdAt } },
    SALE_NUMBERS_STEP,
    { $group: { _id: null, ...GROUP_TOTALS } },
  ]);
  const summary = finishRow(row || {});
  delete summary._id;
  return summary;
}

// Quantity sold and sales value for every product, most sold first.
// Returned items are taken off. The sales value shares out any
// whole-bill discount between the lines of the sale, rounded to whole
// Naira (so totals can differ from the daily report by a few Naira).
async function productSales(createdAt) {
  const rows = await Sale.aggregate([
    { $match: { createdAt } },
    // What share of each line's price the customer really paid after a bill discount.
    { $addFields: { linesTotal: { $sum: '$items.lineTotal' } } },
    { $addFields: { paidShare: { $cond: [{ $gt: ['$linesTotal', 0] }, { $divide: ['$total', '$linesTotal'] }, 0] } } },
    { $unwind: '$items' },
    {
      $project: {
        product: '$items.product',
        name: '$items.name',
        kept: { $subtract: ['$items.quantity', { $ifNull: ['$items.returnedQuantity', 0] }] },
        lineTotal: '$items.lineTotal',
        quantity: '$items.quantity',
        costPrice: { $ifNull: ['$items.costPrice', 0] },
        paidShare: 1,
      },
    },
    {
      $project: {
        product: 1,
        name: 1,
        kept: 1,
        revenue: { $multiply: ['$lineTotal', '$paidShare', { $divide: ['$kept', '$quantity'] }] },
        cost: { $multiply: ['$costPrice', '$kept'] },
      },
    },
    { $group: { _id: '$product', name: { $last: '$name' }, quantity: { $sum: '$kept' }, revenue: { $sum: '$revenue' }, cost: { $sum: '$cost' } } },
    { $sort: { quantity: -1, revenue: -1 } },
  ]);

  return rows.map((row) => ({
    product: row._id,
    name: row.name,
    quantity: row.quantity,
    revenue: Math.round(row.revenue),
    cost: Math.round(row.cost),
    profit: Math.round(row.revenue) - Math.round(row.cost),
  }));
}

module.exports = { dailySales, weeklySales, salesByCashier, salesSummary, productSales, addRows };
