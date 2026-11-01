// The app's own database: the shop's data is kept in files on this
// computer (see store.js). No database program needs to be installed.
//
//   const db = require('../db');
//   const productSchema = new db.Schema({ name: { type: String, required: true } }, { timestamps: true });
//   module.exports = db.model('Product', productSchema, 'products');
const { Schema } = require('./schema');
const { model, models } = require('./model');
const { openStore, getStore, closeStore } = require('./connection');
const { newId, isValidId } = require('./ids');
const ejson = require('./ejson');

module.exports = { Schema, model, models, openStore, getStore, closeStore, newId, isValidId, ejson };
