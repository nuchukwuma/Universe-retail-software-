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
    return <p className="muted small span-full">The printer can be chosen in the desktop app. In a web browser the print window opens each time.</p>;
  }

  // Keep the saved printer in the list even if it is switched off right now.
  const names = printers.map((p) => p.name);
  const showSavedPrinter = value && !names.includes(value);

  return (
    <label className="span-full">
      Receipt printer
      <div className="printer-row">
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={loading}>
          <option value="">Show the print window each time</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? ' (default)' : ''}</option>
          ))}
          {showSavedPrinter && <option value={value}>{value} (not found)</option>}
        </select>
        <button type="button" className="btn btn-small" onClick={loadPrinters}>Refresh</button>
      </div>
      <span className="muted small">Pick your receipt printer to print straight away, without the print window. Save, then print a test receipt.</span>
    </label>
  );
}

export default PrinterPicker;
