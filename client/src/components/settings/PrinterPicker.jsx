import { useEffect, useState } from 'react';
import { desktop } from '../../utils/desktop';

// Lets the owner pick which printer receipts go to (desktop app only).
// An empty value means "show the print window each time".
function PrinterPicker({ value, onChange }) {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Asks the desktop app for the printers installed on this laptop.
  async function loadPrinters() {
    setLoading(true);
    try {
      setPrinters(await desktop.getPrinters());
    } catch (error) {
      console.warn('Could not list printers:', error.message);
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (desktop) loadPrinters();
  }, []);

  if (!desktop) {
    return <p className="muted small span-all">The printer can be chosen in the desktop app. In a web browser the print window opens each time.</p>;
  }

  // Keep the saved printer in the list even if it is switched off right now.
  const names = printers.map((p) => p.name);
  const showSavedPrinter = value && !names.includes(value);

  return (
    <div className="field span-all">
      <label className="field-label" htmlFor="printer-name">Receipt printer</label>
      <div className="btn-row">
        <select id="printer-name" className="input-auto" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={loading}>
          <option value="">Show the print window each time</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? ' (default)' : ''}</option>
          ))}
          {showSavedPrinter && <option value={value}>{value} (not found)</option>}
        </select>
        <button type="button" className="btn" onClick={loadPrinters}>Look for printers again</button>
      </div>
      <span className="field-help">Choose the receipt printer to print straight away, with no print window. Save, then print a test receipt.</span>
    </div>
  );
}

export default PrinterPicker;
