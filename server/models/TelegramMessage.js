const mongoose = require('mongoose');

// A Telegram alert waiting to be sent (an "outbox").
// Every alert is saved here FIRST, so if Telegram or the internet is down
// the sale still completes and the alert is retried later.
const telegramMessageSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['sale', 'test'], default: 'sale' },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    receiptNumber: { type: String, default: '' },
    text: { type: String, required: true },
    // pending -> sending -> sent, or back to pending to try again,
    // or failed after too many tries
    status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String, default: '' },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

telegramMessageSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model('TelegramMessage', telegramMessageSchema);
