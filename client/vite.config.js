import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite settings. The "proxy" sends every /api request from the React
// app (port 5173) to the Express server (port 5000) during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
