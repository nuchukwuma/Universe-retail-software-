import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/api';

// Shares the logged-in user with every page of the app.
const AuthContext = createContext(null);

const LOGIN_TIME_KEY = 'pos_login_time';

// Wraps the app and keeps track of who is logged in.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loginTime, setLoginTime] = useState(localStorage.getItem(LOGIN_TIME_KEY));
  const [checkingSession, setCheckingSession] = useState(true);

  // When the app first opens, check whether a saved token is still valid.
  useEffect(() => {
    async function checkSavedLogin() {
      if (!getToken()) {
        setCheckingSession(false);
        return;
      }
      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        clearSession();
      } finally {
        setCheckingSession(false);
      }
    }
    checkSavedLogin();
  }, []);

  // If any API call reports an expired session, log out automatically.
  useEffect(() => {
    window.addEventListener('pos-session-expired', clearSession);
    return () => window.removeEventListener('pos-session-expired', clearSession);
  }, []);

  // Sends the username and password to the server and saves the result.
  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password });
    const now = new Date().toISOString();

    setToken(data.token);
    localStorage.setItem(LOGIN_TIME_KEY, now);
    setLoginTime(now);
    setUser(data.user);
    return data.user;
  }

  // Removes the saved token and user from the browser.
  function clearSession() {
    setToken(null);
    localStorage.removeItem(LOGIN_TIME_KEY);
    setLoginTime(null);
    setUser(null);
  }

  const value = { user, loginTime, checkingSession, login, logout: clearSession };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Lets any component read the logged-in user: const { user } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
