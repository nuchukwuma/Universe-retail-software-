import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PrintProvider } from './context/PrintContext';
import '@fontsource-variable/bitter/wght.css'; // fonts are bundled: the shop laptop is offline
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/receipt.css';

// Starts the React app inside the <div id="root"> in index.html.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <PrintProvider>
            <App />
          </PrintProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
