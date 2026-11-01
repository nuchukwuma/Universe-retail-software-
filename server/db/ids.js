const crypto = require('crypto');

// Record ids: 24 hexadecimal characters, the same shape MongoDB used, so
// records brought over from older versions keep their ids.
//   8 characters: the time the record was made (seconds)
//  10 characters: random, picked once when the app starts
//   6 characters: a counter, so two records made in the same second differ
const PROCESS_PART = crypto.randomBytes(5).toString('hex');
let counter = crypto.randomBytes(3).readUIntBE(0, 3);

// Makes a new, unique record id.
function newId() {
  counter = (counter + 1) % 0x1000000;
  const time = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  return time + PROCESS_PART + counter.toString(16).padStart(6, '0');
}

// True if the value looks like a record id.
function isValidId(value) {
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
}

module.exports = { newId, isValidId };
