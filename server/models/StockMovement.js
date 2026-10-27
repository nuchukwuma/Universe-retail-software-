const mongoose = require('mongoose');

// A record of every change to a product's stock, so you can see
// when stock came in or went out, and who did it.
//   receive = new stock delivered       adjust = quantity edited by hand
//   count   = corrected by a stock count
//   sale / return = added in later stages by the checkout
const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    type: { type: String, enum: ['receive', 'adjust', 'count', 'sale', 'return'], required: true },
    quantityChange: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    costPrice: { type: Number, default: null },
    note: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);
