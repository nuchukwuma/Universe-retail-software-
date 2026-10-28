import { useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

// First-time setup, shown when the app has no staff accounts yet:
// the owner chooses the store name and creates their own account.
function SetupForm({ onDone }) {
  const { startSession } = useAuth();
  const { reloadSettings } = useSettings();
  const [form, setForm] = useState({
    storeName: 'Universe Cosmetics & Beauty',
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

  // Creates the owner account and logs straight in.
  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError('The two passwords are not the same.');
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
    <form className="login-card setup-card" onSubmit={handleSubmit}>
      <img src="/logo.png" alt="" className="login-logo" />
      <h1>Welcome!</h1>
      <p className="muted">Let's set up the shop. You only do this once.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <label>
        Shop name
        <input value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} required />
      </label>
      <label>
        Your name (the owner)
        <input value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} required autoFocus />
      </label>
      <label>
        Choose a username
        <input value={form.username} onChange={(e) => setField('username', e.target.value)} required autoComplete="username" />
      </label>
      <label>
        Choose a password (at least 6 characters)
        <input type="password" minLength={6} value={form.password} onChange={(e) => setField('password', e.target.value)} required autoComplete="new-password" />
      </label>
      <label>
        Type the password again
        <input type="password" minLength={6} value={form.confirm} onChange={(e) => setField('confirm', e.target.value)} required autoComplete="new-password" />
      </label>
      <label className="checkbox-row setup-sample">
        <input type="checkbox" checked={form.loadSampleData} onChange={(e) => setField('loadSampleData', e.target.checked)} />
        Add sample products so I can practise (you can delete them later)
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
        {saving ? 'Setting up...' : 'Start using the app'}
      </button>
      <p className="muted small">Write the username and password down somewhere safe. All data stays on this computer.</p>
    </form>
  );
}

export default SetupForm;
