const mongoose = require('mongoose');

// Connects to MongoDB using the MONGO_URI from the .env file.
// Stops the app if the database cannot be reached.
async function connectDB() {
  try {
    // Give up after 10 seconds instead of waiting forever.
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message);
    console.error('Is MongoDB running? Check MONGO_URI in your .env file.');
    process.exit(1);
  }
}

module.exports = connectDB;
