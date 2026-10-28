// Pure calculation helpers for sales and returns (no database code here),
// so they are easy to read and test.

// An error caused by bad sale details. The route turns it into a 400 reply.
class SaleError extends Error {}

// Rounds to the nearest kobo to avoid tiny decimal errors like 0.30000004.
function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

// Works out a discount in Naira.
// type 'percent': value is a percentage of "base" (max 100%), rounded to
//                 whole Naira because shops do not hand out kobo.
// type 'amount':  value is Naira (never more than "base").
function discountAmount(type, value, base) {
  const number = Number(value) || 0;
  if (number <= 0 || base <= 0) return 0;
  if (type === 'percent') return Math.round((base * Math.min(number, 100)) / 100);
  if (type === 'amount') return roundMoney(Math.min(number, base));
  return 0;
}

// Turns the bill sent by the till ({ productId, quantity, discountType?,
// discountValue? } lines) into sale lines, using prices from the database -
// never prices sent by the browser.
function buildSaleItems(requestItems, productsById) {
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

    const unitPrice = product.sellingPrice;
    const lineSubtotal = roundMoney(unitPrice * quantity);
    const discountType = ['percent', 'amount'].includes(line.discountType) ? line.discountType : '';
    const discount = discountAmount(discountType, line.discountValue, lineSubtotal);

    return {
      product: product._id,
      name: product.name,
      barcode: product.barcode || '',
      unitPrice,
      quantity,
      discountType: discount > 0 ? discountType : '',
      discountValue: discount > 0 ? Number(line.discountValue) : 0,
      discount,
      lineTotal: roundMoney(lineSubtotal - discount),
    };
  });
}

// Adds up the sale lines and applies any discount on the whole bill.
// billDiscount looks like { type: 'percent' | 'amount', value } (or nothing).
function calculateTotals(saleItems, billDiscountRequest = {}) {
  const subtotal = roundMoney(saleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const lineDiscounts = roundMoney(saleItems.reduce((sum, item) => sum + item.discount, 0));
  const afterLineDiscounts = roundMoney(subtotal - lineDiscounts);

  const type = ['percent', 'amount'].includes(billDiscountRequest?.type) ? billDiscountRequest.type : '';
  const billDiscount = discountAmount(type, billDiscountRequest?.value, afterLineDiscounts);
  const discountTotal = roundMoney(lineDiscounts + billDiscount);

  return {
    subtotal,
    billDiscountType: billDiscount > 0 ? type : '',
    billDiscountValue: billDiscount > 0 ? Number(billDiscountRequest.value) : 0,
    billDiscount,
    discountTotal,
    total: roundMoney(subtotal - discountTotal),
  };
}

// Returns the total discount as a percentage of the bill (0 - 100).
function discountPercent(totals) {
  return totals.subtotal > 0 ? (totals.discountTotal / totals.subtotal) * 100 : 0;
}

// Returns what the customer really paid for ONE of this sale line,
// after line discounts AND their share of any whole-bill discount,
// rounded to whole Naira. (The route never refunds more than the sale total.)
function refundPerItem(sale, item) {
  const linesTotal = sale.items.reduce((sum, line) => sum + line.lineTotal, 0);
  const share = linesTotal > 0 ? sale.total / linesTotal : 0;
  return Math.round((item.lineTotal / item.quantity) * share);
}

// Builds the list of returned items from the request
// ([{ lineIndex, quantity }]) and checks nobody returns more than they bought.
function buildReturnItems(sale, requestItems) {
  const wanted = (Array.isArray(requestItems) ? requestItems : []).filter((r) => Number(r.quantity) > 0);
  if (wanted.length === 0) {
    throw new SaleError('Choose at least one item to return.');
  }

  return wanted.map((request) => {
    const item = sale.items[request.lineIndex];
    if (!item) {
      throw new SaleError('An item to return is not on this receipt.');
    }

    const quantity = Number(request.quantity);
    const canStillReturn = item.quantity - (item.returnedQuantity || 0);
    if (!Number.isInteger(quantity) || quantity > canStillReturn) {
      throw new SaleError(`Only ${canStillReturn} of ${item.name} can still be returned.`);
    }

    const perItem = refundPerItem(sale, item);
    return {
      lineIndex: Number(request.lineIndex),
      product: item.product,
      name: item.name,
      quantity,
      refundPerItem: perItem,
      refundAmount: roundMoney(perItem * quantity),
    };
  });
}

module.exports = {
  SaleError,
  roundMoney,
  discountAmount,
  buildSaleItems,
  calculateTotals,
  discountPercent,
  refundPerItem,
  buildReturnItems,
};
