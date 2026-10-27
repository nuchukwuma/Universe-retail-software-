const mongoose = require('mongoose');

// A bill put on hold to finish later (e.g. the customer went to get
// more money). The whole bill from the till is saved as-is in "bill".
const heldBillSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },
    bill: { type: mongoose.Schema.Types.Mixed, required: true },
    itemCount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    heldByName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HeldBill', heldBillSchema);
