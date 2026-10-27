const mongoose = require('mongoose');

// Store-wide settings. There is only ever ONE settings record.
// Everything here is safe to show to staff (no passwords or secrets).
const settingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'Universe Cosmetics & Beauty', trim: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    footerMessage: { type: String, default: 'Thank you for shopping with us!', trim: true },
    logo: { type: String, default: '/logo.png' },
    showLogoOnReceipt: { type: Boolean, default: true },
    paperSize: { type: String, enum: ['58mm', '80mm', 'A4'], default: '80mm' },
    autoPrint: { type: Boolean, default: false },
    // Cashiers can give discounts up to this % of the bill without a manager.
    maxCashierDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
