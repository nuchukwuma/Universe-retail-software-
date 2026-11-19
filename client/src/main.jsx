import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { installDemo } from '@demo';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PrintProvider } from './context/PrintContext';
import { LicenceProvider } from './context/LicenceContext';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/pos.css';
import './styles/receipt.css';

// The website's demo has no server, so it uses addresses like #/checkout.
const Router = import.meta.env.VITE_DEMO === '1' ? HashRouter : BrowserRouter;

// Starts the React app inside the <div id="root"> in index.html.
installDemo().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Router>
        <SettingsProvider>
          <AuthProvider>
            <LicenceProvider>
              <PrintProvider>
                <App />
              </PrintProvider>
            </LicenceProvider>
          </AuthProvider>
        </SettingsProvider>
      </Router>
    </React.StrictMode>
  );
});
