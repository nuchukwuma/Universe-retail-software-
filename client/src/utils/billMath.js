// Small helpers for working out prices and totals on the bill.
// (The server checks everything again when the sale is saved.)

// Returns the price to charge for a product with the chosen price type.
// Wholesale uses the wholesale price if the product has one.
export function unitPriceFor(product, priceType) {
  if (priceType === 'wholesale' && product.wholesalePrice > 0) {
    return product.wholesalePrice;
  }
  return product.sellingPrice;
}

// Rounds to the nearest kobo to avoid tiny decimal errors.
export function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

// Adds up the bill lines.
// Returns { subtotal, discountTotal, total, lineCount, quantityCount }.
export function billTotals(items) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const discountTotal = roundMoney(items.reduce((sum, item) => sum + (item.discount || 0), 0));
  const quantityCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    discountTotal,
    total: roundMoney(subtotal - discountTotal),
    lineCount: items.length,
    quantityCount,
  };
}

// Checks a list of payment parts against the bill total, using the same
// rules as the server. Returns { paid, change, problem } where "problem"
// is a message to show, or '' if the payment is fine.
export function checkPaymentParts(payments, total) {
  const paid = roundMoney(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const cash = payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const change = roundMoney(paid - total);

  let problem = '';
  if (paid < total) {
    problem = `Still to pay: ₦${roundMoney(total - paid).toLocaleString('en-NG')}`;
  } else if (change > cash) {
    problem = 'Transfer and card amounts cannot be more than the bill. Only cash can get change.';
  }
  return { paid, change: Math.max(change, 0), problem };
}

// Suggests easy cash amounts for a bill, e.g. 28,600 -> 28,600 / 29,000 / 30,000 / 50,000.
export function quickCashAmounts(total) {
  const amounts = [500, 1000, 5000, 10000, 50000].map((step) => Math.ceil(total / step) * step);
  return [...new Set([total, ...amounts])].filter((amount) => amount >= total).slice(0, 5);
}

// Friendly names for each way of paying.
export const PAYMENT_LABELS = {
  cash: 'Cash',
  transfer: 'Bank Transfer',
  card: 'Card (POS)',
  split: 'Split Payment',
};
