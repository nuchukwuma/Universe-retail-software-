const db = require('../db');

// A company or person the shop buys stock from.
const supplierSchema = new db.Schema(
  {
    name: { type: String, required: [true, 'Supplier name is required.'], unique: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = db.model('Supplier', supplierSchema, 'suppliers');
