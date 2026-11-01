const db = require('../db');

// A bill put on hold to finish later (e.g. the customer went to get
// more money). The whole bill from the till is saved as-is in "bill".
const heldBillSchema = new db.Schema(
  {
    label: { type: String, default: '', trim: true },
    bill: { type: db.Schema.Types.Mixed, required: true },
    itemCount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    heldBy: { type: db.Schema.Types.ObjectId, ref: 'User' },
    heldByName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = db.model('HeldBill', heldBillSchema, 'heldbills');
