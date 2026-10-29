const StockMovement = require('../models/StockMovement');

// Saves a stock movement record for a product.
// "change" is how much the quantity went up (+) or down (-).
async function logStockMovement({ product, type, change, user, note }) {
  await StockMovement.create({
    product: product._id,
    productName: product.name,
    type,
    quantityChange: change,
    quantityAfter: product.quantity,
    note: note || '',
    user: user?._id,
    userName: user?.name || '',
  });
}

// Makes text safe to use inside a search pattern (e.g. "1L (pack)").
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { logStockMovement, escapeRegex };
