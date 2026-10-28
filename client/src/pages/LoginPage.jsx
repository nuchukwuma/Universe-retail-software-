import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import SetupForm from '../components/SetupForm';

// The login screen. Every staff member logs in here first.
// On a brand-new install (no staff accounts yet) it shows the
// first-time setup form instead.
function LoginPage() {
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [needsSetup, setNeedsSetup] = useState(false);
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

  // Already logged in? Go straight to the checkout.
  if (user) {
    return <Navigate to="/checkout" replace />;
  }

  // Runs when the Login button is pressed.
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

  if (needsSetup) {
    return (
      <div className="login-page">
        <SetupForm onDone={() => navigate('/dashboard')} />
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={settings.logo || '/logo.png'} alt={`${settings.storeName} logo`} className="login-logo" />
        <h1>{settings.storeName}</h1>
        <p className="muted">Staff login</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
