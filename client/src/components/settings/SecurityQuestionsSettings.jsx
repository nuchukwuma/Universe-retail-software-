import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import SecurityQuestionsFields from '../SecurityQuestionsFields';
import { emptySecurityAnswers, securityAnswersProblem } from '../../utils/securityQuestions';

// Settings: the owner's three security questions for "Forgot your password?"
// on the sign-in screen. Set them here if the shop was set up before they
// existed, or change them. The current password is needed.
function SecurityQuestionsSettings() {
  const { user, updateUser } = useAuth();
  const [rows, setRows] = useState(emptySecurityAnswers);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Opened from the reminder on the Today page (/settings#recovery): show this part.
  useEffect(() => {
    if (window.location.hash === '#recovery') document.getElementById('recovery')?.scrollIntoView();
  }, []);

  // Saves the three questions and answers.
  async function handleSubmit(event) {
    event.preventDefault();
    const problem = securityAnswersProblem(rows);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await api.put('/auth/security-questions', { currentPassword: password, questions: rows });
      updateUser(data.user);
      setMessage(data.message);
      setRows(emptySecurityAnswers());
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel" id="recovery" aria-labelledby="recovery-heading">
      <form className="stack" onSubmit={handleSubmit}>
        <div>
          <h2 id="recovery-heading">Password recovery questions</h2>
          {!user?.hasSecurityQuestions && <p className="warning-text">Not set</p>}
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {message && <div className="notice notice-success" role="status">{message}</div>}
        <SecurityQuestionsFields idPrefix="settings" rows={rows} onChange={setRows} />
        <div className="field field-narrow">
          <label className="field-label" htmlFor="recovery-password">Your current password</label>
          <input id="recovery-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save security questions'}</button>
        </div>
      </form>
    </section>
  );
}

export default SecurityQuestionsSettings;
