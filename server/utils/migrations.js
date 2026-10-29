// Tidies data saved by older versions of the app.
//
// Version 2 (the redesign) removed: product cost price, wholesale price,
// expiry date and picture; category icons and pictures; suppliers; how a
// sale was paid (cash/transfer/card, amount handed over, change); how a
// refund was paid; the shop logo. The app ignores those old fields anyway,
// so nothing breaks if they are still there - this just removes them.
//
// Runs each time the server starts (and after a backup is restored), but
// only does work once: the version reached is saved in the settings.
// A safety backup is made first, so the old data can always be restored.

const mongoose = require('mongoose');
const { getSettings } = require('./settings');
const { createBackup } = require('./backup');

const CURRENT_DATA_VERSION = 2;

// Which old fields to remove from which database table.
// "items.$[].costPrice" means: from every line of the sale.
const FIELDS_TO_REMOVE = [
  { collection: 'products', fields: ['costPrice', 'wholesalePrice', 'expiryDate', 'image'] },
  { collection: 'categories', fields: ['icon', 'image'] },
  { collection: 'sales', fields: ['priceType', 'payments', 'paymentMethod', 'amountTendered', 'change', 'items.$[].costPrice'] },
  { collection: 'returns', fields: ['refundMethod'] },
  { collection: 'stockmovements', fields: ['supplier', 'costPrice'] },
  { collection: 'settings', fields: ['logo', 'showLogoOnReceipt'] },
];
const TABLES_TO_DELETE = ['suppliers'];

// The database filter "has at least one of these old fields".
function hasAnyOf(fields) {
  return { $or: fields.map((field) => ({ [field.replace('.$[]', '')]: { $exists: true } })) };
}

// Returns true if any old field or old table is still in the database.
async function hasOldData(db) {
  for (const { collection, fields } of FIELDS_TO_REMOVE) {
    if (await db.collection(collection).countDocuments(hasAnyOf(fields), { limit: 1 })) return true;
  }
  for (const name of TABLES_TO_DELETE) {
    if ((await db.listCollections({ name }, { nameOnly: true }).toArray()).length) return true;
  }
  return false;
}

// Removes the old fields and tables. Returns a short summary.
async function removeOldData(db) {
  const summary = [];
  for (const { collection, fields } of FIELDS_TO_REMOVE) {
    const unset = Object.fromEntries(fields.map((field) => [field, '']));
    const result = await db.collection(collection).updateMany(hasAnyOf(fields), { $unset: unset });
    if (result.modifiedCount) summary.push(`${collection}: ${result.modifiedCount} tidied`);
  }
  for (const name of TABLES_TO_DELETE) {
    if ((await db.listCollections({ name }, { nameOnly: true }).toArray()).length) {
      await db.collection(name).drop();
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

    const db = mongoose.connection.db;
    if (await hasOldData(db)) {
      // Keep a copy of everything as it was, before removing anything.
      try {
        const backup = await createBackup('before-update');
        console.log(`Data update: safety backup saved in ${backup.folder}`);
      } catch (error) {
        console.error(`Data update postponed: the safety backup failed (${error.message}). It will be tried again at the next start.`);
        return;
      }
      const summary = await removeOldData(db);
      console.log(`Data update: removed fields the app no longer uses (${summary.join(', ') || 'nothing to change'}).`);
    }

    const fresh = await getSettings(); // the backup above saved the settings too
    fresh.dataVersion = CURRENT_DATA_VERSION;
    await fresh.save();
  } catch (error) {
    console.error('Data update failed, will try again at the next start:', error.message);
  }
}

module.exports = { runMigrations, CURRENT_DATA_VERSION, FIELDS_TO_REMOVE };
