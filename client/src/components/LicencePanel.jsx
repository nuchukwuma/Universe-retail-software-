import { useState } from 'react';
import { CreditCard, KeyRound, RefreshCw } from 'lucide-react';
import { api } from '../api/api';
import { useLicence } from '../context/LicenceContext';
import { formatDate } from '../utils/dates';

// The owner's licence controls: what the licence is, a box for a licence
// key, renew online, and the link to pay. Used in Settings and on the
// locked till.
export function licenceSummary(licence) {
  if (!licence) return '';
  if (licence.plan === 'demo') return 'Demo';
  if (licence.state === 'trial') return `Free trial: ${licence.daysLeft} day${licence.daysLeft === 1 ? '' : 's'} left`;
  if (licence.state === 'licensed' && licence.plan === 'lifetime') return 'Licensed (no end date)';
  if (licence.state === 'licensed') return `Paid until ${formatDate(licence.paidUntil)}`;
  return licence.paidUntil ? `Ran out on ${formatDate(licence.paidUntil)}` : 'Free trial ended';
}

function LicencePanel({ compact = false }) {
  const { licence, setLicence } = useLicence();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function run(kind, action) {
    setBusy(kind);
    setError('');
    setMessage('');
    try {
      const status = await action();
      setLicence(status);
      setKey('');
      setMessage(status.state === 'licensed' ? 'Licence saved. Thank you.' : 'Licence saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (!licence) return null;
  const tone = licence.state === 'expired' ? 'danger-text' : licence.renewSoon || licence.state === 'trial' ? 'warning-text' : 'success-text';

  return (
    <div className="stack licence-panel">
      {!compact && (
        <dl className="facts">
          <dt>Licence</dt>
          <dd className={`strong ${tone}`}>{licenceSummary(licence)}</dd>
          {licence.shop && (
            <>
              <dt>For</dt>
              <dd>{licence.shop}</dd>
            </>
          )}
        </dl>
      )}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}
      <form className="stack" onSubmit={(e) => { e.preventDefault(); run('save', () => api.put('/licence', { key })); }}>
        <div className="field">
          <label className="field-label" htmlFor={compact ? 'lock-licence-key' : 'licence-key'}>Licence key</label>
          <textarea
            id={compact ? 'lock-licence-key' : 'licence-key'}
            className="licence-key-box"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="HD1...."
            spellCheck={false}
            rows={3}
          />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={!key.trim() || Boolean(busy)}>
            <KeyRound size={18} aria-hidden="true" /> {busy === 'save' ? 'Checking...' : 'Save licence key'}
          </button>
          {licence.canRenewOnline && licence.licenceId && (
            <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => run('renew', () => api.post('/licence/renew'))}>
              <RefreshCw size={18} aria-hidden="true" /> {busy === 'renew' ? 'Renewing...' : 'Renew online'}
            </button>
          )}
          {licence.payUrl && licence.plan !== 'lifetime' && (
            <a className="btn" href={licence.payUrl} target="_blank" rel="noreferrer">
              <CreditCard size={18} aria-hidden="true" /> Pay ₦5,000 a month
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

export default LicencePanel;
