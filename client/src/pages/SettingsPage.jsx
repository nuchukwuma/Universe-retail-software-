import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { usePrinter } from '../context/PrintContext';
import PageHeader from '../components/PageHeader';
import SaleReceipt from '../components/receipts/SaleReceipt';
import TelegramSettings from '../components/settings/TelegramSettings';
import PrinterPicker from '../components/settings/PrinterPicker';

// A made-up sale used for the preview and the "Print test receipt" button.
const TEST_SALE = {
  receiptNumber: 'TEST-0001',
  createdAt: new Date().toISOString(),
  items: [
    { name: 'Royal Stallion Rice 5kg', quantity: 1, unitPrice: 12500, discount: 0, lineTotal: 12500 },
    { name: 'Peak Milk Powder 400g', quantity: 2, unitPrice: 4200, discount: 420, discountType: 'percent', discountValue: 5, lineTotal: 7980 },
  ],
  subtotal: 20900,
  billDiscount: 0,
  discountTotal: 420,
  total: 20480,
};

// Owner only: shop details, receipts, printing, discounts and Telegram.
function SettingsPage() {
  const { settings, setSettings } = useSettings();
  const { printDocument } = usePrinter();
  const [form, setForm] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // When the settings arrive from the server, fill the form
  // (but never throw away changes the owner is still typing).
  useEffect(() => {
    if (!hasChanges) setForm(settings);
  }, [settings, hasChanges]);

  // Updates one field of the form.
  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setHasChanges(true);
    setMessage('');
  }

  // Saves the settings and uses them straight away.
  // (The Telegram on/off switch saves itself, so it is not sent here.)
  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { telegramAlertsEnabled, ...fields } = form;
      const saved = await api.put('/settings', { ...fields, maxCashierDiscountPercent: Number(form.maxCashierDiscountPercent) });
      setSettings(saved);
      setHasChanges(false);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Settings" lead="The shop's details on receipts, how receipts print, and discount limits." />
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}
      {hasChanges && !message && <div className="notice notice-warning">You have changes that are not saved yet.</div>}

      <div className="columns">
        <form className="panel form-grid" onSubmit={handleSave}>
          <h2 className="form-section">Shop details on receipts</h2>
          <div className="field span-all">
            <label className="field-label" htmlFor="settings-name">Shop name</label>
            <input id="settings-name" value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} required />
          </div>
          <div className="field span-all">
            <label className="field-label" htmlFor="settings-address">Address</label>
            <input id="settings-address" value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="settings-phone">Phone number</label>
            <input id="settings-phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="0803 123 4567" />
          </div>
          <div className="field span-all">
            <label className="field-label" htmlFor="settings-footer">Message at the bottom of receipts</label>
            <input id="settings-footer" value={form.footerMessage} onChange={(e) => setField('footerMessage', e.target.value)} placeholder="Thank you for shopping with us!" />
          </div>

          <h2 className="form-section">Printing</h2>
          <div className="field">
            <label className="field-label" htmlFor="settings-paper">Receipt paper</label>
            <select id="settings-paper" value={form.paperSize} onChange={(e) => setField('paperSize', e.target.value)}>
              <option value="80mm">80mm thermal roll</option>
              <option value="58mm">58mm thermal roll</option>
              <option value="A4">A4 paper</option>
            </select>
          </div>
          <PrinterPicker value={form.printerName} onChange={(name) => setField('printerName', name)} />
          <label className="check span-all">
            <input type="checkbox" checked={form.autoPrint} onChange={(e) => setField('autoPrint', e.target.checked)} />
            Print the receipt as soon as a sale is completed, without showing it first
          </label>

          <h2 className="form-section">Discounts</h2>
          <div className="field">
            <label className="field-label" htmlFor="settings-discount">Largest discount a cashier can give alone (%)</label>
            <input id="settings-discount" type="number" min="0" max="100" value={form.maxCashierDiscountPercent} onChange={(e) => setField('maxCashierDiscountPercent', e.target.value)} />
            <span className="field-help">Above this, a manager types their password on the till.</span>
          </div>

          <div className="span-all btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
            <button type="button" className="btn" onClick={() => printDocument(<SaleReceipt sale={TEST_SALE} settings={form} />, form.paperSize)}>
              Print a test receipt
            </button>
          </div>
        </form>

        <section className="panel stack" aria-label="Receipt preview">
          <h2>Receipt preview</h2>
          <p className="muted small">Changes show here as you type.</p>
          <div className="receipt-preview">
            <div className="receipt-preview-paper">
              <SaleReceipt sale={TEST_SALE} settings={form} />
            </div>
          </div>
        </section>
      </div>

      <TelegramSettings />
    </div>
  );
}

export default SettingsPage;
