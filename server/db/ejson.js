// Turning records into lines of text and back, for the data files and
// backups. Dates are written as {"$date": "2026-10-27T09:13:00.000Z"} so
// they come back as dates, not text.
//
// It also reads backups made by older versions of the app, which used
// MongoDB's "Extended JSON": ids as {"$oid": "..."} and numbers as
// {"$numberInt": "5"}, {"$numberDouble": "1.5"} and so on.

// Makes a copy of a value that JSON can hold (dates tagged, nothing undefined).
function encode(value) {
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : encode(item)));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined && typeof item !== 'function') out[key] = encode(item);
    }
    return out;
  }
  return value;
}

// Turns a number written as text by MongoDB ("5", "1.5", "Infinity") into a number.
function numberFrom(text) {
  if (text === 'Infinity') return Infinity;
  if (text === '-Infinity') return -Infinity;
  return Number(text);
}

// The reverse of encode, also understanding MongoDB's Extended JSON.
function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (!value || typeof value !== 'object') return value;

  const keys = Object.keys(value);
  if (keys.length === 1) {
    const [key] = keys;
    const inner = value[key];
    if (key === '$date') {
      if (inner && typeof inner === 'object' && '$numberLong' in inner) return new Date(Number(inner.$numberLong));
      return new Date(inner);
    }
    if (key === '$oid') return String(inner);
    if (key === '$numberInt' || key === '$numberLong' || key === '$numberDouble' || key === '$numberDecimal') {
      return numberFrom(inner);
    }
  }

  const out = {};
  for (const key of keys) out[key] = decode(value[key]);
  return out;
}

// One record (or any value) as one line of text.
function stringify(value) {
  return JSON.stringify(encode(value));
}

// One line of text back into a record.
function parse(text) {
  return decode(JSON.parse(text));
}

// A deep copy of a record (dates stay dates), so changing the copy never
// changes the saved record.
function clone(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = clone(item);
    return out;
  }
  return value;
}

module.exports = { encode, decode, stringify, parse, clone };
