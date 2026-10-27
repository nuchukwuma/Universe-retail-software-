const mongoose = require('mongoose');

// A product on the shelf. Prices are in Naira.
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required.'], trim: true },
    // "sparse" lets many products have no barcode while still keeping
    // every barcode that IS set unique.
    barcode: { type: String, trim: true, unique: true, sparse: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String, default: '' },
    costPrice: { type: Number, default: 0, min: [0, 'Cost price cannot be negative.'] },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required.'],
      min: [0, 'Selling price cannot be negative.'],
    },
    // Optional lower price for bulk buyers. 0 means "same as selling price".
    wholesalePrice: { type: Number, default: 0, min: [0, 'Wholesale price cannot be negative.'] },
    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 5, min: [0, 'Reorder level cannot be negative.'] },
    expiryDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// An empty barcode box should be saved as "no barcode", not as "".
// Otherwise two products with empty barcodes would clash.
productSchema.pre('validate', function () {
  if (!this.barcode) this.barcode = undefined;
});

module.exports = mongoose.model('Product', productSchema);
