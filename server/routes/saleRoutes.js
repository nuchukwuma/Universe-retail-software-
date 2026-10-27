const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { requireLogin } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { nextReceiptNumber } = require('../utils/counters');
const { logStockMovement } = require('../utils/stockHelpers');
const { SaleError, buildSaleItems, calculateTotals, checkPayments } = require('../utils/saleCalculations');

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

// POST /api/sales
// Completes a sale. Body:
// { items: [{ productId, quantity }], priceType, customerId?, customerName?,
//   payments: [{ method: 'cash'|'transfer'|'card', amount, reference? }] }
router.post('/', async (req, res) => {
  try {
    const { items, priceType = 'standard', customerId, customerName, payments } = req.body;

    // 1. Look up every product on the bill (badly formed ids are skipped,
    //    so they show up as "no longer exists" instead of a database error).
    const productIds = (items || []).map((line) => line.productId).filter((id) => mongoose.isValidObjectId(id));
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = {};
    products.forEach((p) => {
      productsById[String(p._id)] = p;
    });

    // 2. Work out prices, totals and change.
    const saleItems = buildSaleItems(items, productsById, priceType);
    const totals = calculateTotals(saleItems);
    const payment = checkPayments(payments, totals.total);

    // 3. Link the customer, if one was picked.
    const customer = mongoose.isValidObjectId(customerId) ? await Customer.findById(customerId) : null;

    // 4. Save the sale with the next receipt number.
    const sale = await Sale.create({
      receiptNumber: await nextReceiptNumber(),
      items: saleItems,
      priceType: priceType === 'wholesale' ? 'wholesale' : 'standard',
      customer: customer ? customer._id : null,
      customerName: customer ? customer.name : String(customerName || '').trim(),
      ...totals,
      ...payment,
      cashier: req.user._id,
      cashierName: req.user.name,
    });

    // 5. Take the items off the stock.
    await reduceStockForSale(sale, req.user);

    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(400).json({ message: error.message });
    }
    handleError(res, error, 'Could not complete the sale. The bill has been kept - please try again.');
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
