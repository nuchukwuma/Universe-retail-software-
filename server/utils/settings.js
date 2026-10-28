const Settings = require('../models/Settings');

// The settings fields staff are allowed to change (owner only).
const EDITABLE_FIELDS = [
  'storeName', 'address', 'phone', 'footerMessage', 'logo', 'showLogoOnReceipt',
  'paperSize', 'autoPrint', 'printerName', 'maxCashierDiscountPercent', 'telegramAlertsEnabled',
];

// Returns the one settings record, creating it with default values
// the first time the app runs.
async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
}

module.exports = { getSettings, EDITABLE_FIELDS };
