const db = require('../db');

// A product category such as Skincare, Make-up or Hair care.
const categorySchema = new db.Schema(
  {
    name: { type: String, required: [true, 'Category name is required.'], unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = db.model('Category', categorySchema, 'categories');
