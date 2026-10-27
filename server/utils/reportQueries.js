// The database queries behind the reports.
// They use MongoDB "aggregation pipelines": a list of steps the database
// runs one after another (filter -> reshape -> group -> sort), so even a
// year of sales is added up quickly inside the database.
//
// How the numbers are worked out:
//   net sales = what customers paid after discounts (sale.total)
//   refunds   = money given back for returns (counted on the ORIGINAL sale's day)
//   cost      = cost price x quantity kept by the customer (returned items excluded)
//   profit    = net sales - refunds - cost

const Sale = require('../models/Sale');
const { roundMoney } = require('./saleCalculations');

const TIMEZONE = 'Africa/Lagos';

// "How many of this line did the customer keep?" (bought - returned)
const KEPT_QUANTITY = { $subtract: ['$$item.quantity', { $ifNull: ['$$item.returnedQuantity', 0] }] };

// Adds up the payments made with one method inside a sale.
function paidBy(method) {
  return {
    $sum: {
      $map: {
        input: { $filter: { input: '$payments', as: 'p', cond: { $eq: ['$$p.method', method] } } },
        as: 'p',
        in: '$$p.amount',
      },
    },
  };
}

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
    cost: {
      $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.costPrice', KEPT_QUANTITY] } } },
    },
    cash: paidBy('cash'),
    transfer: paidBy('transfer'),
    card: paidBy('card'),
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
  cost: { $sum: '$cost' },
  cash: { $sum: '$cash' },
  transfer: { $sum: '$transfer' },
  card: { $sum: '$card' },
};

// Rounds every money field and adds profit (and average sale).
function finishRow(row) {
  const rounded = { ...row };
  ['grossSales', 'discounts', 'netSales', 'refunds', 'cost', 'cash', 'transfer', 'card'].forEach((key) => {
    rounded[key] = roundMoney(row[key] || 0);
  });
  rounded.profit = roundMoney(rounded.netSales - rounded.refunds - rounded.cost);
  rounded.averageSale = row.transactions ? Math.round(rounded.netSales / row.transactions) : 0;
  return rounded;
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

// One total line for the whole date filter (used for the dashboard cards).
async function salesSummary(createdAt) {
  const [row] = await Sale.aggregate([
    { $match: { createdAt } },
    SALE_NUMBERS_STEP,
    { $group: { _id: null, ...GROUP_TOTALS } },
  ]);
  return finishRow(row || { transactions: 0, itemsSold: 0 });
}

// Quantity, revenue, cost and profit for every product sold, most sold first.
// Revenue shares out any whole-bill discount between the lines of the sale,
// and is rounded to whole Naira (so totals can differ from the daily
// report by a few Naira).
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
        costPrice: '$items.costPrice',
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
    {
      $group: {
        _id: '$product',
        name: { $last: '$name' },
        quantity: { $sum: '$kept' },
        revenue: { $sum: '$revenue' },
        cost: { $sum: '$cost' },
      },
    },
    { $sort: { quantity: -1, revenue: -1 } },
  ]);

  return rows.map((row) => {
    const revenue = Math.round(row.revenue);
    const cost = Math.round(row.cost);
    const profit = revenue - cost;
    return {
      product: row._id,
      name: row.name,
      quantity: row.quantity,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? roundMoney((profit / revenue) * 100) : 0,
    };
  });
}

module.exports = { dailySales, salesByCashier, salesSummary, productSales };
