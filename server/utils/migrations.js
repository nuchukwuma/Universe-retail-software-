// Tidies data saved by older versions of the app.
//
// Version 2 (the redesign) removed: product cost price, wholesale price,
// expiry date and picture; category icons and pictures; suppliers; how a
// sale was paid (cash/transfer/card, amount handed over, change); how a
// refund was paid; the shop logo.
// Version 3 removed: customers (the customer page and the customer name on
// sales and returns) and customer feedback.
// Version 4 corrects the shop name to "Universe Cosmetics and Beauty
// Skincare" if it is still one of the names the app used to fill in.
// The app ignores those old fields anyway, so nothing breaks if they are
// still there - this just removes them.
//
// Runs each time the server starts (and after a backup is restored), but
// only does work once: the version reached is saved in the settings.
// A safety backup is made first, so the old data can always be restored.

const { getStore } = require('../db');
const { getSettings } = require('./settings');
const { createBackup } = require('./backup');

const CURRENT_DATA_VERSION = 4;

// Which old fields to remove from which database table.
// "items.$[].costPrice" means: from every line of the sale.
const FIELDS_TO_REMOVE = [
  { collection: 'products', fields: ['costPrice', 'wholesalePrice', 'expiryDate', 'image'] },
  { collection: 'categories', fields: ['icon', 'image'] },
  { collection: 'sales', fields: ['priceType', 'payments', 'paymentMethod', 'amountTendered', 'change', 'items.$[].costPrice', 'customer', 'customerName'] },
  { collection: 'returns', fields: ['refundMethod', 'customerName'] },
  { collection: 'stockmovements', fields: ['supplier', 'costPrice'] },
  { collection: 'settings', fields: ['logo', 'showLogoOnReceipt'] },
];
const TABLES_TO_DELETE = ['suppliers', 'customers', 'feedbacks'];

// Shop names the app filled in by itself in earlier versions. A name the
// owner typed is never changed.
const SHOP_NAME = 'Universe Cosmetics and Beauty Skincare';
const OLD_DEFAULT_SHOP_NAMES = ['Universe Cosmetics & Beauty', 'Universe Cosmetics & Beauty Skincare'];

// True if a record has the old field "field". "items.$[].costPrice" means
// "costPrice on any line of items".
function hasField(record, field) {
  const [first, rest] = field.split('.$[].');
  if (rest === undefined) return record[first] !== undefined;
  return Array.isArray(record[first]) && record[first].some((line) => line && line[rest] !== undefined);
}

// Removes the old field from a copy of the record.
function withoutField(record, field) {
  const [first, rest] = field.split('.$[].');
  if (rest === undefined) {
    const { [first]: removed, ...others } = record;
    return others;
  }
  if (!Array.isArray(record[first])) return record;
  return { ...record, [first]: record[first].map((line) => {
    if (!line || typeof line !== 'object') return line;
    const { [rest]: removed, ...others } = line;
    return others;
  }) };
}

// Returns true if any old field or old table is still in the data.
function hasOldData(store) {
  for (const { collection, fields } of FIELDS_TO_REMOVE) {
    if (store.all(collection).some((record) => fields.some((field) => hasField(record, field)))) return true;
  }
  return TABLES_TO_DELETE.some((name) => store.has(name));
}

// Removes the old fields and tables. Returns a short summary.
function removeOldData(store) {
  const summary = [];
  for (const { collection, fields } of FIELDS_TO_REMOVE) {
    let tidied = 0;
    for (const record of store.all(collection)) {
      if (!fields.some((field) => hasField(record, field))) continue;
      store.put(collection, fields.reduce(withoutField, record));
      tidied += 1;
    }
    if (tidied) summary.push(`${collection}: ${tidied} tidied`);
  }
  for (const name of TABLES_TO_DELETE) {
    if (store.has(name)) {
      store.drop(name);
      summary.push(`${name}: deleted`);
    }
  }
  return summary;
}

// Brings the data up to date. Never stops the app from starting:
// if something goes wrong it is logged and tried again next time.
async function runMigrations() {
  try {
    const settings = await getSettings();
    if ((settings.dataVersion || 0) >= CURRENT_DATA_VERSION) return;

    const store = getStore();
    if (hasOldData(store)) {
      // Keep a copy of everything as it was, before removing anything.
      try {
        const backup = await createBackup('before-update');
        console.log(`Data update: safety backup saved in ${backup.folder}`);
      } catch (error) {
        console.error(`Data update postponed: the safety backup failed (${error.message}). It will be tried again at the next start.`);
        return;
      }
      const summary = removeOldData(store);
      console.log(`Data update: removed fields the app no longer uses (${summary.join(', ') || 'nothing to change'}).`);
    }

    const fresh = await getSettings(); // the backup above saved the settings too
    if (OLD_DEFAULT_SHOP_NAMES.includes(fresh.storeName)) {
      fresh.storeName = SHOP_NAME;
      console.log(`Data update: shop name changed to "${SHOP_NAME}".`);
    }
    fresh.dataVersion = CURRENT_DATA_VERSION;
    await fresh.save();
  } catch (error) {
    console.error('Data update failed, will try again at the next start:', error.message);
  }
}

module.exports = { runMigrations, CURRENT_DATA_VERSION, FIELDS_TO_REMOVE };
