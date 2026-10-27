const mongoose = require('mongoose');

// One item brought back by the customer.
const returnItemSchema = new mongoose.Schema(
  {
    lineIndex: { type: Number, required: true }, // which line of the original sale
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    refundPerItem: { type: Number, required: true }, // what the customer really paid per item
    refundAmount: { type: Number, required: true },
  },
  { _id: false }
);

// A return / refund made against an earlier sale.
const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    receiptNumber: { type: String, required: true }, // the original receipt
    customerName: { type: String, default: '' },
    items: [returnItemSchema],
    refundTotal: { type: Number, required: true },
    refundMethod: { type: String, enum: ['cash', 'transfer', 'card'], required: true },
    reason: { type: String, required: true, trim: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String, default: '' },
    approvedByName: { type: String, default: '' },
    printCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

returnSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);
