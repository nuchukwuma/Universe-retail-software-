const mongoose = require('mongoose');

// One line on the bill. Name and prices are copied from the product at
// the time of sale, so old receipts stay correct if prices change later.
const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    barcode: { type: String, default: '' },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    discountType: { type: String, default: '' }, // 'percent', 'amount' or '' for none
    discountValue: { type: Number, default: 0 }, // e.g. 10 (%) or 500 (Naira)
    discount: { type: Number, default: 0 }, // Naira off this line
    lineTotal: { type: Number, required: true }, // unitPrice x quantity - discount
    returnedQuantity: { type: Number, default: 0 }, // how many came back later
  },
  { _id: false }
);

// A completed sale (one receipt).
const saleSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true }, // before any discount
    billDiscountType: { type: String, default: '' }, // discount on the whole bill
    billDiscountValue: { type: Number, default: 0 },
    billDiscount: { type: Number, default: 0 }, // Naira off the whole bill
    discountTotal: { type: Number, default: 0 }, // line discounts + bill discount
    discountApprovedBy: { type: String, default: '' }, // manager who approved a large discount
    total: { type: Number, required: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String, default: '' },
    status: { type: String, enum: ['completed', 'partly_returned', 'returned'], default: 'completed' },
    refundedTotal: { type: Number, default: 0 },
    printCount: { type: Number, default: 0 }, // printed before = next print is a DUPLICATE COPY
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
