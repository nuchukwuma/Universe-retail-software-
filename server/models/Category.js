const mongoose = require('mongoose');

// A product category such as Skincare, Make-up or Hair care.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required.'], unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
