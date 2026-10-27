import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { usePrinter } from '../context/PrintContext';
import ImagePicker from '../components/ImagePicker';
import SaleReceipt from '../components/receipts/SaleReceipt';

// A made-up sale used for the preview and the "Print test receipt" button.
const TEST_SALE = {
  receiptNumber: 'TEST-0001',
  createdAt: new Date().toISOString(),
  cashierName: 'Test Cashier',
  customerName: 'Test Customer',
  priceType: 'standard',
  items: [
    { name: 'Royal Stallion Rice 5kg', quantity: 1, unitPrice: 12500, discount: 0, lineTotal: 12500 },
    { name: 'Peak Milk Powder 400g', quantity: 2, unitPrice: 4200, discount: 420, discountType: 'percent', discountValue: 5, lineTotal: 7980 },
  ],
  subtotal: 20900,
  billDiscount: 0,
  discountTotal: 420,
  total: 20480,
  payments: [{ method: 'cash', amount: 20480 }],
  paymentMethod: 'cash',
  amountTendered: 25000,
  change: 4520,
};

// Owner-only page for store details and receipt printing options.
function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const { printDocument } = usePrinter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // When the real settings arrive from the server, fill the form.
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Updates one field of the form.
  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage('');
  }

  // Saves the settings on the server and uses them straight away.
  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await api.put('/settings', { ...form, maxCashierDiscountPercent: Number(form.maxCashierDiscountPercent) });
      setSettings(saved);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="eod-layout">
        <form className="card form-grid" onSubmit={handleSave}>
          <h3 className="form-section">Store details (shown on receipts)</h3>
          <label className="span-full">
            Store name
            <input value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} required />
          </label>
          <label className="span-full">
            Address
            <input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" />
          </label>
          <label>
            Phone number
            <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="0803 123 4567" />
          </label>
          <label className="span-full">
            Message at the bottom of receipts
            <input value={form.footerMessage} onChange={(e) => setField('footerMessage', e.target.value)} placeholder="Thank you for shopping with us!" />
          </label>
          <div className="span-full">
            <span className="field-label">Logo</span>
            <ImagePicker value={form.logo} onChange={(url) => setField('logo', url)} placeholder="🏪" />
          </div>
          <label className="checkbox-row span-full">
            <input type="checkbox" checked={form.showLogoOnReceipt} onChange={(e) => setField('showLogoOnReceipt', e.target.checked)} />
            Print the logo on receipts (printed in black and white)
          </label>

          <h3 className="form-section">Printing</h3>
          <label>
            Receipt paper size
            <select value={form.paperSize} onChange={(e) => setField('paperSize', e.target.value)}>
              <option value="80mm">80mm thermal roll</option>
              <option value="58mm">58mm thermal roll</option>
              <option value="A4">A4 paper</option>
            </select>
          </label>
          <label className="checkbox-row span-full">
            <input type="checkbox" checked={form.autoPrint} onChange={(e) => setField('autoPrint', e.target.checked)} />
            Auto-print receipts (print straight after payment, without the preview)
          </label>

          <h3 className="form-section">Discounts</h3>
          <label>
            Most a cashier can give without a manager (%)
            <input
              type="number"
              min="0"
              max="100"
              value={form.maxCashierDiscountPercent}
              onChange={(e) => setField('maxCashierDiscountPercent', e.target.value)}
            />
          </label>

          <div className="span-full form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
            <button type="button" className="btn" onClick={() => printDocument(<SaleReceipt sale={TEST_SALE} settings={form} />, form.paperSize)}>
              🖨️ Print test receipt
            </button>
          </div>
        </form>

        <div className="card">
          <h2>Receipt preview</h2>
          <div className="receipt-preview">
            <div className="receipt-preview-paper">
              <SaleReceipt sale={TEST_SALE} settings={form} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
