const db = require('../db');

// One line on the bill. Name and prices are copied from the product at
// the time of sale, so old receipts stay correct if prices change later.
const saleItemSchema = new db.Schema(
  {
    product: { type: db.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    barcode: { type: String, default: '' },
    unitPrice: { type: Number, required: true },
    costPrice: { type: Number, default: 0 }, // the product's cost when sold (for profit)
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
const saleSchema = new db.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true }, // before any discount
    billDiscountType: { type: String, default: '' }, // discount on the whole bill
    billDiscountValue: { type: Number, default: 0 },
    billDiscount: { type: Number, default: 0 }, // Naira off the whole bill
    discountTotal: { type: Number, default: 0 }, // line discounts + bill discount
    discountApprovedBy: { type: String, default: '' }, // manager who approved a large discount
    // Loyalty: the customer, points spent (pointsDiscount Naira off, also
    // counted in discountTotal), points earned and their balance after.
    customer: { type: db.Schema.Types.ObjectId, ref: 'Customer', default: null },
    customerName: { type: String, default: '' },
    pointsRedeemed: { type: Number, default: 0 },
    pointsDiscount: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    pointsBalance: { type: Number, default: 0 },
    pointsTakenBack: { type: Number, default: 0 }, // earned points removed again by returns
    total: { type: Number, required: true },
    cashier: { type: db.Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String, default: '' },
    status: { type: String, enum: ['completed', 'partly_returned', 'returned'], default: 'completed' },
    refundedTotal: { type: Number, default: 0 },
    printCount: { type: Number, default: 0 }, // printed before = next print is a DUPLICATE COPY
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });

module.exports = db.model('Sale', saleSchema, 'sales');
