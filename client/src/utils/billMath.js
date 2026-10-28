// Small helpers for working out prices, discounts and totals on the bill.
// (The server checks everything again when the sale is saved.)

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
