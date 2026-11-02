import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import SetupForm from '../components/SetupForm';
import RestoreBackupForm from '../components/RestoreBackupForm';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import logo from '../assets/logo.png';

// The sign-in screen. Every staff member signs in here first.
// On a brand-new install (no staff accounts yet) it shows the
// first-time setup form instead, or restoring a backup.
function LoginPage() {
  const { user, login } = useAuth();
  const { settings, reloadSettings } = useSettings();
  const navigate = useNavigate();

  const [needsSetup, setNeedsSetup] = useState(false);
  const [restoring, setRestoring] = useState(false); // first start: restore a backup instead
  const [restoredMessage, setRestoredMessage] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Ask the server if this is the first start.
  useEffect(() => {
    api.get('/setup/status')
      .then((data) => setNeedsSetup(data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  // After a backup is restored on the first start: sign in as usual.
  async function handleRestored(message) {
    setRestoredMessage(message);
    setRestoring(false);
    setNeedsSetup(false);
    await reloadSettings();
  }

  // Already signed in? Go straight to the till.
  if (user) {
    return <Navigate to="/checkout" replace />;
  }

  // Runs when "Sign in" is pressed.
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/checkout');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="entry">
      <div className="entry-sign">
        <img src={logo} alt="" className="entry-logo" width="240" height="240" />
        <h1>{settings.storeName}</h1>
        <p>{needsSetup ? 'Set up the till. You only do this once.' : 'Sign in to start selling.'}</p>
      </div>

      {needsSetup && restoring && <RestoreBackupForm onDone={handleRestored} onCancel={() => setRestoring(false)} />}
      {needsSetup && !restoring && <SetupForm onDone={() => navigate('/dashboard')} onRestore={() => setRestoring(true)} />}
      {!needsSetup && forgotPassword && <ForgotPasswordForm onDone={() => navigate('/dashboard')} onCancel={() => setForgotPassword(false)} />}
      {!needsSetup && !forgotPassword && (
        <form className="entry-form" onSubmit={handleSubmit}>
          <h2>Staff sign in</h2>
          {restoredMessage && <div className="notice notice-success" role="status">{restoredMessage}</div>}
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <div className="field">
            <label className="field-label" htmlFor="login-username">Username</label>
            <input id="login-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-large btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setForgotPassword(true)}>Forgot your password?</button>
        </form>
      )}
    </div>
  );
}

export default LoginPage;
