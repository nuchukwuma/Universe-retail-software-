const mongoose = require('mongoose');

// A customer the store wants to remember (for purchase history).
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Customer name is required.'], trim: true },
    // Optional, but no two customers can share the same phone number.
    phone: { type: String, trim: true, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Save an empty phone box as "no phone" so empty phones never clash.
customerSchema.pre('validate', function () {
  if (!this.phone) this.phone = undefined;
});

module.exports = mongoose.model('Customer', customerSchema);
