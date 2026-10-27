const StockMovement = require('../models/StockMovement');

// Products expiring within this many days get an expiry alert.
const EXPIRY_WARNING_DAYS = 30;

// Returns the date that is EXPIRY_WARNING_DAYS from today.
function expiryWarningDate() {
  const date = new Date();
  date.setDate(date.getDate() + EXPIRY_WARNING_DAYS);
  return date;
}

// Saves a stock movement record for a product.
// "change" is how much the quantity went up (+) or down (-).
async function logStockMovement({ product, type, change, user, supplier, costPrice, note }) {
  await StockMovement.create({
    product: product._id,
    productName: product.name,
    type,
    quantityChange: change,
    quantityAfter: product.quantity,
    supplier: supplier || null,
    costPrice: costPrice ?? null,
    note: note || '',
    user: user?._id,
    userName: user?.name || '',
  });
}

// Makes text safe to use inside a search pattern (e.g. "1L (pack)").
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { EXPIRY_WARNING_DAYS, expiryWarningDate, logStockMovement, escapeRegex };
