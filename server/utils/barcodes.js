// Builds a valid 13-digit EAN barcode from 12 digits by adding the
// check digit at the end. Scanners use the check digit to catch misreads.
function makeEan13(twelveDigits) {
  const sum = twelveDigits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return twelveDigits + checkDigit;
}

module.exports = { makeEan13 };
