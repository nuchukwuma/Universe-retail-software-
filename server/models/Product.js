const mongoose = require('mongoose');

// A product on the shelf. Prices are in Naira.
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required.'], trim: true },
    // "sparse" lets many products have no barcode while still keeping
    // every barcode that IS set unique.
    barcode: { type: String, trim: true, unique: true, sparse: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required.'],
      min: [0, 'Selling price cannot be negative.'],
    },
    quantity: { type: Number, default: 0 },
    // When stock falls to this number, the product shows as "low".
    reorderLevel: { type: Number, default: 5, min: [0, 'Low-stock level cannot be negative.'] },
  },
  { timestamps: true }
);

// An empty barcode box should be saved as "no barcode", not as "".
// Otherwise two products with empty barcodes would clash.
productSchema.pre('validate', function () {
  if (!this.barcode) this.barcode = undefined;
});

module.exports = mongoose.model('Product', productSchema);
