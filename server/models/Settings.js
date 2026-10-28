const mongoose = require('mongoose');

// Store-wide settings. There is only ever ONE settings record.
// The Telegram bot token and chat id are kept here too, but they are
// removed whenever the settings are sent to the app (see toJSON below).
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
    // Desktop app: the printer receipts go to. Empty = ask every time.
    printerName: { type: String, default: '' },
    // Cashiers can give discounts up to this % of the bill without a manager.
    maxCashierDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },

    // Telegram sales alerts
    telegramAlertsEnabled: { type: Boolean, default: true },
    telegramBotToken: { type: String, default: '', trim: true }, // secret - never sent to the app
    telegramChatId: { type: String, default: '', trim: true },

    // Backups
    autoBackupEnabled: { type: Boolean, default: true },
    backupFolder: { type: String, default: '' }, // empty = the app's own backups folder
    lastBackupAt: { type: Date, default: null },
    lastBackupError: { type: String, default: '' },
  },
  { timestamps: true }
);

// Removes the secret bot token (and the raw chat id) whenever the settings
// are turned into JSON for the app. The owner's Telegram page shows
// "set / not set" instead.
settingsSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.telegramBotToken;
    delete ret.telegramChatId;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Settings', settingsSchema);
