// Pure calculation helpers for sales (no database code here),
// so they are easy to read and test.

const PAYMENT_METHODS = ['cash', 'transfer', 'card'];

// An error caused by bad sale details. The route turns it into a 400 reply.
class SaleError extends Error {}

// Rounds to the nearest kobo to avoid tiny decimal errors like 0.30000004.
function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

// Returns the price to charge for a product. Wholesale customers pay the
// wholesale price when the product has one, otherwise the normal price.
function priceFor(product, priceType) {
  if (priceType === 'wholesale' && product.wholesalePrice > 0) {
    return product.wholesalePrice;
  }
  return product.sellingPrice;
}

// Turns the bill sent by the till ({ productId, quantity } lines) into sale
// lines, using prices from the database - never prices sent by the browser.
function buildSaleItems(requestItems, productsById, priceType) {
  if (!Array.isArray(requestItems) || requestItems.length === 0) {
    throw new SaleError('The bill is empty.');
  }

  return requestItems.map((line) => {
    const product = productsById[String(line.productId)];
    if (!product) {
      throw new SaleError('A product on the bill no longer exists. Remove it and try again.');
    }

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new SaleError(`Quantity for ${product.name} must be a whole number above 0.`);
    }

    const unitPrice = priceFor(product, priceType);
    return {
      product: product._id,
      name: product.name,
      barcode: product.barcode || '',
      unitPrice,
      costPrice: product.costPrice || 0,
      quantity,
      discount: 0,
      lineTotal: roundMoney(unitPrice * quantity),
    };
  });
}

// Adds up the sale lines.
function calculateTotals(saleItems) {
  const subtotal = roundMoney(saleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const discountTotal = roundMoney(saleItems.reduce((sum, item) => sum + item.discount, 0));
  return { subtotal, discountTotal, total: roundMoney(subtotal - discountTotal) };
}

// Checks how the customer paid and works out the change.
// Rules: the parts must cover the total, and change can only be given
// back from cash (you cannot give change from a transfer or card).
function checkPayments(requestPayments, total) {
  const parts = (Array.isArray(requestPayments) ? requestPayments : [])
    .map((p) => ({ method: p.method, amount: roundMoney(Number(p.amount)), reference: String(p.reference || '').trim() }))
    .filter((p) => p.amount !== 0);

  parts.forEach((p) => {
    if (!PAYMENT_METHODS.includes(p.method)) {
      throw new SaleError(`Unknown payment method "${p.method}".`);
    }
    if (Number.isNaN(p.amount) || p.amount < 0) {
      throw new SaleError('Payment amounts must be numbers above 0.');
    }
  });

  const amountTendered = roundMoney(parts.reduce((sum, p) => sum + p.amount, 0));
  if (amountTendered < total) {
    throw new SaleError(`Payment is short by ₦${(total - amountTendered).toLocaleString('en-NG')}.`);
  }

  const change = roundMoney(amountTendered - total);
  const cashGiven = parts.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  if (change > cashGiven) {
    throw new SaleError('Transfer and card amounts cannot be more than the bill. Only cash can get change.');
  }

  // Save the cash the shop KEPT (cash given minus change), so the
  // end-of-day cash total matches what is really in the till.
  const cashKept = roundMoney(cashGiven - change);
  const payments = parts.filter((p) => p.method !== 'cash');
  if (cashKept > 0) {
    payments.unshift({ method: 'cash', amount: cashKept, reference: '' });
  }

  const methods = [...new Set(payments.map((p) => p.method))];
  const paymentMethod = methods.length > 1 ? 'split' : methods[0] || 'cash';

  return { payments, paymentMethod, amountTendered, change };
}

module.exports = { SaleError, roundMoney, priceFor, buildSaleItems, calculateTotals, checkPayments };
