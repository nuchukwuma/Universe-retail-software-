// Main entry point for the backend API.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Allow the React app to call this API and read JSON request bodies.
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// A quick way to check that the server is running.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Any /api address we do not know about
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

// Connects to the database first, then starts listening for requests.
async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  await connectDB();

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}

startServer();
