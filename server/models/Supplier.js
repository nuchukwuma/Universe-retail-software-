const mongoose = require('mongoose');

// A company or person the store buys stock from.
const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Supplier name is required.'], trim: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
