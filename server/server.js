// Starts the backend API for development (npm run dev).
// The desktop app starts the same server from desktop/main.js instead.
require('dotenv').config();

const { startServer } = require('./app');

startServer({ port: process.env.PORT || 5000 }).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
