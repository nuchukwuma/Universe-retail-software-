import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { usePrinter } from '../context/PrintContext';
import PageHeader from '../components/PageHeader';
import SaleReceipt from '../components/receipts/SaleReceipt';
import TelegramSettings from '../components/settings/TelegramSettings';
import SecurityQuestionsSettings from '../components/settings/SecurityQuestionsSettings';
import PrinterPicker from '../components/settings/PrinterPicker';
import PictureField from '../components/PictureField';
import { IS_DEMO } from '../config';
import BrandMark from '../components/BrandMark';
import LicencePanel from '../components/LicencePanel';

// A made-up sale used for the preview and the "Print test receipt" button.
const TEST_SALE = {
  receiptNumber: 'TEST-0001',
  createdAt: new Date().toISOString(),
  items: [
    { name: 'Nivea Soft Cream 200ml', quantity: 1, unitPrice: 4500, discount: 0, lineTotal: 4500 },
    { name: 'Nivea Body Lotion 400ml', quantity: 2, unitPrice: 6500, discount: 650, discountType: 'percent', discountValue: 5, lineTotal: 12350 },
  ],
  subtotal: 17500,
  billDiscount: 0,
  discountTotal: 650,
  total: 16850,
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

  // The logo saves as soon as it is chosen or removed.
  async function changeLogo(dataUrl) {
    setError('');
    try {
      const saved = dataUrl ? await api.put('/settings/logo', { logo: dataUrl }) : await api.delete('/settings/logo');
      setSettings(saved);
      setForm((current) => ({ ...current, logoUrl: saved.logoUrl }));
      setMessage(dataUrl ? 'Logo saved.' : 'Logo removed.');
    } catch (err) {
      setError(err.message);
    }
  }

  // Saves the settings and uses them straight away.
  // (The Telegram on/off switch saves itself, so it is not sent here.)
  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { telegramAlertsEnabled, ...fields } = form;
      const saved = await api.put('/settings', {
        ...fields,
        maxCashierDiscountPercent: Number(form.maxCashierDiscountPercent),
        loyaltyEarnEvery: Number(form.loyaltyEarnEvery) || 100,
        loyaltyPointValue: Number(form.loyaltyPointValue) || 0,
      });
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
      <PageHeader title="Settings" />
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}
      {hasChanges && !message && <div className="notice notice-warning">Unsaved changes</div>}

      <div className="columns">
        <form className="panel form-grid" onSubmit={handleSave}>
          <h2 className="form-section">Shop</h2>
          <div className="span-all">
            <PictureField id="settings-logo" label="Logo" value={form.logoUrl || ''} onChange={changeLogo} maxSize={512} fallback={<BrandMark size={64} />} />
          </div>
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
            <input type="checkbox" checked={form.receiptLogo !== false} onChange={(e) => setField('receiptLogo', e.target.checked)} />
            Print the logo on receipts
          </label>
          <label className="check span-all">
            <input type="checkbox" checked={form.autoPrint} onChange={(e) => setField('autoPrint', e.target.checked)} />
            Print receipts automatically after each sale
          </label>

          <h2 className="form-section">Discounts</h2>
          <div className="field">
            <label className="field-label" htmlFor="settings-discount">Largest discount a cashier can give alone (%)</label>
            <input id="settings-discount" type="number" min="0" max="100" value={form.maxCashierDiscountPercent} onChange={(e) => setField('maxCashierDiscountPercent', e.target.value)} />
          </div>

          <h2 className="form-section">Loyalty points</h2>
          <label className="check span-all">
            <input type="checkbox" checked={Boolean(form.loyaltyEnabled)} onChange={(e) => setField('loyaltyEnabled', e.target.checked)} />
            Customers collect points
          </label>
          {form.loyaltyEnabled && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="settings-earn">1 point for every (₦)</label>
                <input id="settings-earn" type="number" min="1" step="1" value={form.loyaltyEarnEvery} onChange={(e) => setField('loyaltyEarnEvery', e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="settings-point-value">1 point is worth (₦)</label>
                <input id="settings-point-value" type="number" min="0" step="any" value={form.loyaltyPointValue} onChange={(e) => setField('loyaltyPointValue', e.target.value)} />
              </div>
            </>
          )}

          <div className="span-all btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</button>
            <button type="button" className="btn" onClick={() => printDocument(<SaleReceipt sale={TEST_SALE} settings={form} />, form.paperSize)}>
              Print a test receipt
            </button>
          </div>
        </form>

        <section className="panel stack" aria-label="Receipt preview">
          <h2>Receipt preview</h2>
          <div className="receipt-preview receipt-preview-full">
            <div className="receipt-preview-paper">
              <SaleReceipt sale={TEST_SALE} settings={form} />
            </div>
          </div>
        </section>
      </div>

      {!IS_DEMO && (
        <section className="panel stack" id="licence" aria-labelledby="licence-heading">
          <h2 id="licence-heading">Licence</h2>
          <LicencePanel />
        </section>
      )}

      <SecurityQuestionsSettings />

      <TelegramSettings />
    </div>
  );
}

export default SettingsPage;
