const db = require('../db');

// One product on a purchase order.
const purchaseItemSchema = new db.Schema(
  {
    product: { type: db.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, 'Order at least 1 of each product.'] },
    unitCost: { type: Number, required: true, min: [0, 'The cost cannot be negative.'] },
    receivedQuantity: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true }, // quantity x unitCost
  },
  { _id: false }
);

// A purchase order: stock ordered from a supplier. Receiving it adds the
// stock and sets each product's cost price.
//   ordered -> part_received -> received   (or cancelled)
const purchaseSchema = new db.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true }, // e.g. P261118-0001
    supplier: { type: db.Schema.Types.ObjectId, ref: 'Supplier', required: [true, 'Choose a supplier.'] },
    supplierName: { type: String, default: '' },
    items: [purchaseItemSchema],
    total: { type: Number, required: true },
    status: { type: String, enum: ['ordered', 'part_received', 'received', 'cancelled'], default: 'ordered' },
    expectedDate: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
    createdBy: { type: db.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, default: '' },
    receivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = db.model('Purchase', purchaseSchema, 'purchases');
