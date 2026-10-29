// Builds the Express app and starts it.
// Used by server.js (development) and by the desktop app (desktop/main.js).
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { startTelegramWorker } = require('./utils/telegramQueue');
const { startBackupSchedule } = require('./utils/backup');
const { runMigrations } = require('./utils/migrations');

const authRoutes = require('./routes/authRoutes');
const setupRoutes = require('./routes/setupRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const stockRoutes = require('./routes/stockRoutes');
const saleRoutes = require('./routes/saleRoutes');
const returnRoutes = require('./routes/returnRoutes');
const heldBillRoutes = require('./routes/heldBillRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const managerReportRoutes = require('./routes/managerReportRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Creates the Express app with every API route.
// "clientDir" is the built React app (client/dist). When given, the
// server also shows the app's screens, so no separate web server is needed.
function createApp({ clientDir } = {}) {
  const app = express();

  // In development the React app runs on its own port, so allow it to
  // call this API. (The desktop app serves both from one address.)
  if (!clientDir) app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // A quick way to check that the server is running.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/setup', setupRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/held-bills', heldBillRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/reports', reportRoutes); // end-of-day (everyone)
  app.use('/api/reports', managerReportRoutes); // Today page, sales and stock reports (managers/owners)
  app.use('/api/telegram', telegramRoutes);
  app.use('/api/backups', backupRoutes);

  // Any /api address we do not know about
  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API route not found.' });
  });

  // The app's screens (desktop app). Any other address shows index.html,
  // and React decides which page to show.
  if (clientDir && fs.existsSync(path.join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir));
    app.get('*', (req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  }

  return app;
}

// Connects to the database, starts the background jobs and starts
// listening. Throws if the database cannot be reached.
// Options: { port, host, clientDir }
async function startServer({ port = 5000, host, clientDir } = {}) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
  }

  await connectDB();
  await runMigrations(); // tidy data saved by older versions of the app

  startTelegramWorker(); // retries Telegram alerts that could not be sent yet
  startBackupSchedule(); // makes the automatic daily backup

  const app = createApp({ clientDir });
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, host, () => resolve(listener));
    listener.on('error', reject);
  });

  console.log(`API server running on http://${host || 'localhost'}:${server.address().port}`);
  return server;
}

// Stops the server and closes the database connection (used when the
// desktop app closes).
async function stopServer(server) {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
}

module.exports = { createApp, startServer, stopServer };
