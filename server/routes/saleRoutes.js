const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { requireLogin } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { nextReceiptNumber } = require('../utils/counters');
const { logStockMovement, escapeRegex } = require('../utils/stockHelpers');
const { getSettings } = require('../utils/settings');
const { findApprover } = require('../utils/approval');
const { createdAtFilter } = require('../utils/dates');
const { queueSaleAlert } = require('../utils/telegramQueue');
const {
  SaleError, buildSaleItems, calculateTotals, discountPercent, checkPayments,
} = require('../utils/saleCalculations');

const router = express.Router();

// Every route in this file needs a logged-in user (cashiers included).
router.use(requireLogin);

// Takes the sold quantities off the shelf stock and records each change.
async function reduceStockForSale(sale, user) {
  for (const item of sale.items) {
    const product = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { quantity: -item.quantity } },
      { new: true }
    );
    if (product) {
      await logStockMovement({
        product, type: 'sale', change: -item.quantity, user, note: `Receipt ${sale.receiptNumber}`,
      });
    }
  }
}

// GET /api/sales?search=&from=YYYY-MM-DD&to=YYYY-MM-DD
// Lists sales (newest first) for the Sales History page.
// "search" matches a receipt number or a customer's name.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    const search = String(req.query.search || '').trim();
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ receiptNumber: pattern }, { customerName: pattern }];
    }

    const dateFilter = createdAtFilter(req.query.from, req.query.to);
    if (dateFilter) filter.createdAt = dateFilter;

    const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(sales);
  } catch (error) {
    handleError(res, error, 'Could not load sales.');
  }
});

// GET /api/sales/by-receipt/:receiptNumber
// Finds a sale by its receipt number (typed, or scanned from the receipt).
router.get('/by-receipt/:receiptNumber', async (req, res) => {
  try {
    const sale = await Sale.findOne({ receiptNumber: req.params.receiptNumber.trim().toUpperCase() });
    if (!sale) {
      return res.status(404).json({ message: `No sale has the receipt number ${req.params.receiptNumber}.` });
    }
    res.json(sale);
  } catch (error) {
    handleError(res, error, 'Could not look up the receipt.');
  }
});

// POST /api/sales
// Completes a sale. Body:
// { items: [{ productId, quantity, discountType?, discountValue? }], priceType,
//   billDiscount?: { type, value }, customerId?, customerName?, approvalToken?,
//   payments: [{ method: 'cash'|'transfer'|'card', amount, reference? }] }
router.post('/', async (req, res) => {
  try {
    const { items, priceType = 'standard', billDiscount, customerId, customerName, payments } = req.body;

    // 1. Look up every product on the bill (badly formed ids are skipped,
    //    so they show up as "no longer exists" instead of a database error).
    const productIds = (items || []).map((line) => line.productId).filter((id) => mongoose.isValidObjectId(id));
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = {};
    products.forEach((p) => {
      productsById[String(p._id)] = p;
    });

    // 2. Work out prices, discounts, totals and change.
    const saleItems = buildSaleItems(items, productsById, priceType);
    const totals = calculateTotals(saleItems, billDiscount);
    const payment = checkPayments(payments, totals.total);

    // 3. Large discounts need a manager or owner.
    let discountApprovedBy = '';
    if (totals.discountTotal > 0) {
      const settings = await getSettings();
      const approver = await findApprover(req);
      if (discountPercent(totals) > settings.maxCashierDiscountPercent + 0.001 && !approver) {
        return res.status(403).json({
          code: 'APPROVAL_REQUIRED',
          message: `Discounts above ${settings.maxCashierDiscountPercent}% need a manager's approval.`,
        });
      }
      discountApprovedBy = approver ? approver.name : '';
    }

    // 4. Link the customer, if one was picked.
    const customer = mongoose.isValidObjectId(customerId) ? await Customer.findById(customerId) : null;

    // 5. Save the sale with the next receipt number.
    const sale = await Sale.create({
      receiptNumber: await nextReceiptNumber(),
      items: saleItems,
      priceType: priceType === 'wholesale' ? 'wholesale' : 'standard',
      customer: customer ? customer._id : null,
      customerName: customer ? customer.name : String(customerName || '').trim(),
      ...totals,
      discountApprovedBy,
      ...payment,
      cashier: req.user._id,
      cashierName: req.user.name,
    });

    // 6. Take the items off the stock.
    await reduceStockForSale(sale, req.user);

    res.status(201).json(sale);

    // 7. Send the Telegram alert AFTER replying, so the till never waits for
    //    Telegram. If it fails, it is saved and retried later.
    queueSaleAlert(sale).catch((error) => {
      console.error(`Could not queue Telegram alert for ${sale.receiptNumber}:`, error.message);
    });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(400).json({ message: error.message });
    }
    handleError(res, error, 'Could not complete the sale. The bill has been kept - please try again.');
  }
});

// POST /api/sales/:id/printed
// Records that the receipt was printed. Every print after the first one
// is marked "DUPLICATE COPY".
router.post('/:id/printed', async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, { $inc: { printCount: 1 } }, { new: true });
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found.' });
    }
    res.json({ printCount: sale.printCount });
  } catch (error) {
    handleError(res, error, 'Could not record the print.');
  }
});

// GET /api/sales/:id
// Returns one sale (used to show and reprint receipts).
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found.' });
    }
    res.json(sale);
  } catch (error) {
    handleError(res, error, 'Could not load sale.');
  }
});

module.exports = router;
