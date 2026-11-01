const db = require('../db');

// One item brought back by the customer.
const returnItemSchema = new db.Schema(
  {
    lineIndex: { type: Number, required: true }, // which line of the original sale
    product: { type: db.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    refundPerItem: { type: Number, required: true }, // what the customer really paid per item
    refundAmount: { type: Number, required: true },
  },
  { _id: false }
);

// A return / refund made against an earlier sale.
const returnSchema = new db.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    sale: { type: db.Schema.Types.ObjectId, ref: 'Sale', required: true },
    receiptNumber: { type: String, required: true }, // the original receipt
    items: [returnItemSchema],
    refundTotal: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    processedBy: { type: db.Schema.Types.ObjectId, ref: 'User' },
    processedByName: { type: String, default: '' },
    approvedByName: { type: String, default: '' },
    printCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

returnSchema.index({ createdAt: -1 });

module.exports = db.model('Return', returnSchema, 'returns');
