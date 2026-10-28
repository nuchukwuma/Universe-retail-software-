const mongoose = require('mongoose');

// The database on this computer, unless MONGO_URI in .env says otherwise.
const DEFAULT_URI = 'mongodb://127.0.0.1:27017/universe_pos';

// Connects to MongoDB. Gives up after 10 seconds and throws a helpful
// error, so the app can tell the user that MongoDB is not running.
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || DEFAULT_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
  } catch (error) {
    throw new Error(
      `Could not connect to MongoDB (${error.message}). Is MongoDB installed and running?`
    );
  }
}

module.exports = connectDB;
