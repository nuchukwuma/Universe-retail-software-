const Counter = require('../models/Counter');

// Adds 1 to the named counter and returns the new number.
// $inc happens in one step in the database, so two tills finishing a
// sale at the same moment can never get the same number.
async function nextCounterValue(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return counter.value;
}

// Returns today's date in Lagos time as "YYMMDD", e.g. "261027".
// (The server might be set to another time zone, so we ask for Lagos.)
function lagosDateCode(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type).value;
  return part('year') + part('month') + part('day');
}

// Returns the next receipt number, e.g. "261027-0015".
// The count starts again from 0001 every day.
async function nextReceiptNumber() {
  const dateCode = lagosDateCode();
  const number = await nextCounterValue(`receipt-${dateCode}`);
  return `${dateCode}-${String(number).padStart(4, '0')}`;
}

module.exports = { nextCounterValue, nextReceiptNumber, lagosDateCode };
