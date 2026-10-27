// Small helpers for working out prices, discounts and totals on the bill.
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

// Works out a discount in Naira (same rules as the server).
// type 'percent': value is a % of "base" (max 100%), rounded to whole Naira.
// type 'amount':  value is Naira (never more than "base").
export function discountAmount(type, value, base) {
  const number = Number(value) || 0;
  if (number <= 0 || base <= 0) return 0;
  if (type === 'percent') return Math.round((base * Math.min(number, 100)) / 100);
  if (type === 'amount') return roundMoney(Math.min(number, base));
  return 0;
}

// Returns the Naira discount on one bill line.
export function lineDiscount(item) {
  return discountAmount(item.discountType, item.discountValue, item.unitPrice * item.quantity);
}

// Adds up the bill lines and applies the whole-bill discount (if any).
// Returns { subtotal, lineDiscounts, billDiscount, discountTotal, total,
//           discountPercent, lineCount, quantityCount }.
export function billTotals(items, billDiscountSetting = null) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const lineDiscounts = roundMoney(items.reduce((sum, item) => sum + lineDiscount(item), 0));
  const billDiscount = discountAmount(billDiscountSetting?.type, billDiscountSetting?.value, subtotal - lineDiscounts);
  const discountTotal = roundMoney(lineDiscounts + billDiscount);

  return {
    subtotal,
    lineDiscounts,
    billDiscount,
    discountTotal,
    total: roundMoney(subtotal - discountTotal),
    discountPercent: subtotal > 0 ? (discountTotal / subtotal) * 100 : 0,
    lineCount: items.length,
    quantityCount: items.reduce((sum, item) => sum + item.quantity, 0),
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
