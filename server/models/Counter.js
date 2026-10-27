const mongoose = require('mongoose');

// A named running number, e.g. "receipt-261027" -> 15.
// Used to give receipts and in-store barcodes the next free number.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
