import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite settings.
// - In development, the "proxy" sends every /api request from the React
//   app (port 5173) to the Express server (port 5000).
// - "npm run build" makes the finished app in client/dist, which the
//   desktop app shows.
// - "npm run build:demo" makes the browser demo for the website (the
//   server code runs inside the page; see demo/build.mjs).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'demo' ? './' : '/',
  resolve: {
    alias: {
      '@demo': fileURLToPath(new URL(mode === 'demo' ? './src/demo/installDemo.js' : './src/demo/noDemo.js', import.meta.url)),
    },
  },
  build: {
    // The desktop app for Windows 8 uses Chromium 108, so build for it.
    target: 'chrome108',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
}));
