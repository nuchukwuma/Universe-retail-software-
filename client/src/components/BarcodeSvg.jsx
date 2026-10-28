import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

// Returns true for a valid 13-digit EAN barcode (the usual shop barcode).
function isEan13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const sum = digits.slice(0, 12).reduce((total, d, i) => total + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

// Draws the stripes of a barcode for labels and receipts, so a scanner can
// read it. EAN-13 codes are drawn as EAN-13;
// anything else uses CODE128, which can hold any letters or numbers.
function BarcodeSvg({ value, height = 40, width = 1.6, fontSize = 12 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const options = { height, width, fontSize, margin: 0, background: 'transparent' };
    try {
      JsBarcode(svgRef.current, value, { ...options, format: isEan13(value) ? 'EAN13' : 'CODE128' });
    } catch {
      JsBarcode(svgRef.current, value, { ...options, format: 'CODE128' });
    }
  }, [value, height, width, fontSize]);

  return <svg ref={svgRef} className="barcode-svg" />;
}

export default BarcodeSvg;
