const db = require('../db');

// A loyalty customer: the shop knows them by their phone number and they
// collect points on what they buy (see utils/loyalty.js).
const customerSchema = new db.Schema(
  {
    name: { type: String, required: [true, 'Enter the customer\'s name.'], trim: true },
    phone: { type: String, required: [true, 'Enter the customer\'s phone number.'], unique: true, trim: true },
    points: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0 },
    visits: { type: Number, default: 0 },
    lastVisitAt: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = db.model('Customer', customerSchema, 'customers');
