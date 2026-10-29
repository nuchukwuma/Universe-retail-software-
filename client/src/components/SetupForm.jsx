import { useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

// First-time setup, shown when the app has no staff accounts yet:
// the owner names the shop and creates their own account.
function SetupForm({ onDone }) {
  const { startSession } = useAuth();
  const { reloadSettings } = useSettings();
  const [form, setForm] = useState({
    storeName: 'Universe Cosmetics & Beauty Skincare',
    ownerName: '',
    username: '',
    password: '',
    confirm: '',
    loadSampleData: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Updates one field of the form.
  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Creates the owner account and signs straight in.
  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError('The two passwords are not the same. Type them again.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { confirm, ...details } = form;
      startSession(await api.post('/setup', details));
      await reloadSettings();
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <h2>First-time setup</h2>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="field">
        <label className="field-label" htmlFor="setup-store">Shop name (printed on receipts)</label>
        <input id="setup-store" value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-owner">Your name (the owner)</label>
        <input id="setup-owner" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} required autoFocus />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-username">Choose a username</label>
        <input id="setup-username" value={form.username} onChange={(e) => setField('username', e.target.value)} required autoComplete="username" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-password">Choose a password</label>
        <input id="setup-password" type="password" minLength={6} value={form.password} onChange={(e) => setField('password', e.target.value)} required autoComplete="new-password" />
        <span className="field-help">At least 6 characters.</span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-confirm">Type the password again</label>
        <input id="setup-confirm" type="password" minLength={6} value={form.confirm} onChange={(e) => setField('confirm', e.target.value)} required autoComplete="new-password" />
      </div>
      <label className="check">
        <input type="checkbox" checked={form.loadSampleData} onChange={(e) => setField('loadSampleData', e.target.checked)} />
        Add sample products to practise with (you can delete them later)
      </label>

      <button type="submit" className="btn btn-primary btn-large btn-block" disabled={saving}>
        {saving ? 'Setting up...' : 'Finish setup'}
      </button>
      <p className="muted small">Write the username and password down somewhere safe. All data stays on this computer.</p>
    </form>
  );
}

export default SetupForm;
