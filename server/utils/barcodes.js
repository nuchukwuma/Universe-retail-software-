// Builds a valid 13-digit EAN barcode from 12 digits by adding the
// check digit at the end. Scanners use the check digit to catch misreads.
function makeEan13(twelveDigits) {
  const sum = twelveDigits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return twelveDigits + checkDigit;
}

// Makes an in-store barcode from a running number, e.g. 7 -> 2000000000077.
// Codes starting with "2" are reserved for shops' own use, so they will
// never clash with a manufacturer's barcode.
function makeStoreBarcode(runningNumber) {
  return makeEan13('200' + String(runningNumber).padStart(9, '0'));
}

module.exports = { makeEan13, makeStoreBarcode };
