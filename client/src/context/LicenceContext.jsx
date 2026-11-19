import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from './AuthContext';

// The shop's licence (trial, licensed or expired), for the banner, the
// locked till and Settings. See server/utils/licence.js.
const LicenceContext = createContext({ licence: null, reloadLicence: () => {} });

export function LicenceProvider({ children }) {
  const { user } = useAuth();
  const [licence, setLicence] = useState(null);

  const reloadLicence = useCallback(async () => {
    try {
      setLicence(await api.get('/licence'));
    } catch {
      // keep what we had
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLicence(null);
      return undefined;
    }
    reloadLicence();
    const timer = setInterval(reloadLicence, 30 * 60 * 1000);
    window.addEventListener('pos-licence-required', reloadLicence);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pos-licence-required', reloadLicence);
    };
  }, [user, reloadLicence]);

  return <LicenceContext.Provider value={{ licence, setLicence, reloadLicence }}>{children}</LicenceContext.Provider>;
}

export function useLicence() {
  return useContext(LicenceContext);
}
