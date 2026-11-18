import { useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import SecurityQuestionsFields from './SecurityQuestionsFields';
import { emptySecurityAnswers, securityAnswersProblem } from '../utils/securityQuestions';

// First-time setup, shown when the app has no staff accounts yet:
// the owner names the shop and creates their own account, with three
// security questions for "Forgot your password?".
function SetupForm({ sampleCatalogues = [], onDone, onRestore }) {
  const { startSession } = useAuth();
  const { reloadSettings } = useSettings();
  const [form, setForm] = useState({
    storeName: '',
    ownerName: '',
    username: '',
    password: '',
    confirm: '',
    loadSampleData: '',
  });
  const [questions, setQuestions] = useState(emptySecurityAnswers);
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
    const questionsProblem = securityAnswersProblem(questions);
    if (questionsProblem) {
      setError(questionsProblem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { confirm, ...details } = form;
      startSession(await api.post('/setup', { ...details, securityQuestions: questions }));
      await reloadSettings();
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="entry-title-row">
        <h1>Set up your shop</h1>
        <button type="button" className="btn btn-quiet btn-small" onClick={onRestore}>Restore a backup</button>
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="field">
        <label className="field-label" htmlFor="setup-store">Shop name</label>
        <input id="setup-store" value={form.storeName} onChange={(e) => setField('storeName', e.target.value)} required autoFocus placeholder="My Shop" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-owner">Your name</label>
        <input id="setup-owner" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-username">Username</label>
        <input id="setup-username" value={form.username} onChange={(e) => setField('username', e.target.value)} required autoComplete="username" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-password">Password</label>
        <input id="setup-password" type="password" minLength={6} value={form.password} onChange={(e) => setField('password', e.target.value)} required autoComplete="new-password" />
        <span className="field-help">At least 6 characters.</span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="setup-confirm">Confirm password</label>
        <input id="setup-confirm" type="password" minLength={6} value={form.confirm} onChange={(e) => setField('confirm', e.target.value)} required autoComplete="new-password" />
      </div>
      <fieldset className="form-fieldset">
        <legend>Password recovery questions</legend>
        <SecurityQuestionsFields idPrefix="setup" rows={questions} onChange={setQuestions} />
      </fieldset>
      {sampleCatalogues.length > 0 && (
        <div className="field">
          <label className="field-label" htmlFor="setup-sample">Sample products</label>
          <select id="setup-sample" value={form.loadSampleData} onChange={(e) => setField('loadSampleData', e.target.value)}>
            <option value="">None</option>
            {sampleCatalogues.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-large btn-block" disabled={saving}>
        {saving ? 'Setting up...' : 'Finish setup'}
      </button>
    </form>
  );
}

export default SetupForm;
