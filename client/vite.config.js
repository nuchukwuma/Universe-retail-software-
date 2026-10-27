import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Vite settings. The "proxy" sends every /api and /uploads request from
// the React app (port 5173) to the Express server (port 5000).
//
// "npm run dev:phone" starts in "phone" mode, which turns on HTTPS.
// Phone browsers only allow the camera (for barcode scanning) on HTTPS.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'phone' ? [react(), basicSsl()] : [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
}));
