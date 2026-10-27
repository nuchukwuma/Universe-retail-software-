import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/api';
import { DEFAULT_SETTINGS } from '../config';

// Shares the store settings (name, receipt options...) with every page.
const SettingsContext = createContext({ settings: DEFAULT_SETTINGS });

// Loads the settings once when the app opens.
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Fetches the latest settings from the server (no login needed).
  const reloadSettings = useCallback(async () => {
    try {
      const data = await api.get('/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (error) {
      // Keep the defaults if the server cannot be reached.
      console.warn('Could not load settings:', error.message);
    }
  }, []);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Lets any component read the settings: const { settings } = useSettings();
export function useSettings() {
  return useContext(SettingsContext);
}
