const db = require('../db');
const { imageUrl } = require('../utils/images');
require('./Supplier'); // products refer to suppliers (populate)

// A product on the shelf. Prices are in Naira.
const productSchema = new db.Schema(
  {
    name: { type: String, required: [true, 'Product name is required.'], trim: true },
    // "sparse" lets many products have no barcode while still keeping
    // every barcode that IS set unique.
    barcode: { type: String, trim: true, unique: true, sparse: true },
    category: { type: db.Schema.Types.ObjectId, ref: 'Category', default: null },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required.'],
      min: [0, 'Selling price cannot be negative.'],
    },
    // What the shop pays for one (the last purchase price). 0 = not known.
    costPrice: { type: Number, default: 0, min: [0, 'Cost price cannot be negative.'] },
    supplier: { type: db.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    picture: { type: String, default: '' }, // optional photo, see utils/images.js
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

// Adds the address of the product's picture (if it has one) for the app.
productSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.pictureUrl = imageUrl(ret.picture);
    return ret;
  },
});

module.exports = db.model('Product', productSchema, 'products');
