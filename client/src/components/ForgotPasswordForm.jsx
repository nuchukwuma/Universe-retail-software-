import { useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

// "Forgot your password?" for the owner: answer the three security
// questions chosen at setup, then choose a new password (and be signed in).
// Other staff ask the owner, who can reset any password on the Staff page.
function ForgotPasswordForm({ onDone, onCancel }) {
  const { startSession } = useAuth();
  const [username, setUsername] = useState('');
  const [questions, setQuestions] = useState(null); // null until the username is checked
  const [answers, setAnswers] = useState(['', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Step 1: find the owner's questions.
  async function findQuestions(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.get(`/auth/recovery-questions?username=${encodeURIComponent(username.trim())}`);
      setQuestions(data.questions);
      if (data.lockedMinutes) setError(`Too many wrong answers. Try again in ${data.lockedMinutes} minute${data.lockedMinutes === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Step 2: check the answers and set the new password.
  async function resetPassword(event) {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords are not the same. Type them again.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      startSession(await api.post('/auth/recover', { username: username.trim(), answers, newPassword: password }));
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!questions) {
    return (
      <form className="entry-form" onSubmit={findQuestions}>
        <h2>Forgot your password?</h2>
        <p className="muted">The owner can choose a new password by answering their three security questions. Other staff: ask the owner to reset your password on the Staff page.</p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <div className="field">
          <label className="field-label" htmlFor="forgot-username">Your username</label>
          <input id="forgot-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </div>
        <button type="submit" className="btn btn-primary btn-large btn-block" disabled={busy}>{busy ? 'Checking...' : 'Next'}</button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Back to sign in</button>
      </form>
    );
  }

  return (
    <form className="entry-form" onSubmit={resetPassword}>
      <h2>Answer your security questions</h2>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {questions.map((question, index) => (
        <div className="field" key={question}>
          <label className="field-label" htmlFor={`forgot-a${index}`}>{question}</label>
          <input
            id={`forgot-a${index}`}
            value={answers[index]}
            onChange={(e) => setAnswers(answers.map((a, i) => (i === index ? e.target.value : a)))}
            autoComplete="off"
            autoFocus={index === 0}
            required
          />
        </div>
      ))}
      <div className="field">
        <label className="field-label" htmlFor="forgot-password">New password</label>
        <input id="forgot-password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        <span className="field-help">At least 6 characters.</span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="forgot-confirm">Type the new password again</label>
        <input id="forgot-confirm" type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </div>
      <button type="submit" className="btn btn-primary btn-large btn-block" disabled={busy}>{busy ? 'Checking...' : 'Change password and sign in'}</button>
      <button type="button" className="btn btn-quiet" onClick={onCancel}>Back to sign in</button>
    </form>
  );
}

export default ForgotPasswordForm;
