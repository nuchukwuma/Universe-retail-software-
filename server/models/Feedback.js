const mongoose = require('mongoose');

// A customer's comment, recorded by the cashier at the till.
const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: String, enum: ['happy', 'neutral', 'unhappy'], required: [true, 'Choose how the customer felt.'] },
    comment: { type: String, default: '', trim: true },
    customerName: { type: String, default: '', trim: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
