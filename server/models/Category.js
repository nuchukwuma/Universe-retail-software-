const mongoose = require('mongoose');

// A product category such as Rice, Cooking Oil or Provisions.
// "icon" is an emoji shown when no image has been uploaded.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required.'], unique: true, trim: true },
    icon: { type: String, default: '🛒' },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
