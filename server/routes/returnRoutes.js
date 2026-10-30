const express = require('express');
const mongoose = require('mongoose');
const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { requireLogin } = require('../middleware/auth');
const handleError = require('../utils/handleError');
const { nextReturnNumber } = require('../utils/counters');
const { logStockMovement } = require('../utils/stockHelpers');
const { findApprover } = require('../utils/approval');
const { createdAtFilter } = require('../utils/dates');
const { SaleError, roundMoney, buildReturnItems } = require('../utils/saleCalculations');

const router = express.Router();

// Every route in this file needs a logged-in user.
router.use(requireLogin);

// Puts returned items back on the shelf stock and records each change.
async function addStockForReturn(ret, user) {
  for (const item of ret.items) {
    const product = await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } }, { new: true });
    if (product) {
      await logStockMovement({
        product, type: 'return', change: item.quantity, user, note: `Return ${ret.returnNumber} (receipt ${ret.receiptNumber})`,
      });
    }
  }
}

// GET /api/returns?saleId=...  or  ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Lists returns, newest first.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (mongoose.isValidObjectId(req.query.saleId)) filter.sale = req.query.saleId;
    const dateFilter = createdAtFilter(req.query.from, req.query.to);
    if (dateFilter) filter.createdAt = dateFilter;

    res.json(await Return.find(filter).sort({ createdAt: -1 }).limit(300));
  } catch (error) {
    handleError(res, error, 'Could not load returns.');
  }
});

// POST /api/returns
// Returns items from an earlier sale, refunds the customer and puts the
// items back in stock. Needs a manager/owner (or a cashier with an approvalToken).
// Body: { saleId, items: [{ lineIndex, quantity }], reason, approvalToken? }
router.post('/', async (req, res) => {
  try {
    const approver = await findApprover(req);
    if (!approver) {
      return res.status(403).json({ code: 'APPROVAL_REQUIRED', message: 'A manager or owner must approve returns.' });
    }

    const { saleId, items, reason } = req.body;
    if (!String(reason || '').trim()) {
      return res.status(400).json({ message: 'Enter the reason for the return.' });
    }

    const sale = mongoose.isValidObjectId(saleId) ? await Sale.findById(saleId) : null;
    if (!sale) {
      return res.status(404).json({ message: 'Original sale not found.' });
    }

    // Work out what is returned and how much to refund.
    const returnItems = buildReturnItems(sale, items);
    const stillRefundable = roundMoney(sale.total - (sale.refundedTotal || 0));
    const refundTotal = Math.min(
      roundMoney(returnItems.reduce((sum, item) => sum + item.refundAmount, 0)),
      stillRefundable
    );

    const ret = await Return.create({
      returnNumber: await nextReturnNumber(),
      sale: sale._id,
      receiptNumber: sale.receiptNumber,
      items: returnItems,
      refundTotal,
      reason,
      processedBy: req.user._id,
      processedByName: req.user.name,
      approvedByName: approver.name,
    });

    // Mark the items as returned on the original sale.
    returnItems.forEach((item) => {
      sale.items[item.lineIndex].returnedQuantity += item.quantity;
    });
    sale.refundedTotal = roundMoney((sale.refundedTotal || 0) + refundTotal);
    const everythingBack = sale.items.every((item) => item.returnedQuantity >= item.quantity);
    sale.status = everythingBack ? 'returned' : 'partly_returned';
    await sale.save();

    await addStockForReturn(ret, req.user);

    res.status(201).json({ return: ret, sale });
  } catch (error) {
    if (error instanceof SaleError) {
      return res.status(400).json({ message: error.message });
    }
    handleError(res, error, 'Could not complete the return.');
  }
});

// POST /api/returns/:id/printed
// Records a print of the return receipt (later prints are DUPLICATE COPY).
router.post('/:id/printed', async (req, res) => {
  try {
    const ret = await Return.findByIdAndUpdate(req.params.id, { $inc: { printCount: 1 } }, { new: true });
    if (!ret) {
      return res.status(404).json({ message: 'Return not found.' });
    }
    res.json({ printCount: ret.printCount });
  } catch (error) {
    handleError(res, error, 'Could not record the print.');
  }
});

module.exports = router;
