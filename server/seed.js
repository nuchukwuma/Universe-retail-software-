// Adds sample data so you can test the app straight away (development).
// Run it with:  npm run seed
// It is safe to run more than once - existing records are left alone.
// (In the desktop app, the first-time setup screen can add the sample
// products instead.)
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { seedSampleUsers, loadSampleCatalogue } = require('./utils/sampleData');

// Connects to the database, adds the sample data, then disconnects.
async function runSeed() {
  try {
    await connectDB();
    console.log('Seeding...');
    await seedSampleUsers();
    await loadSampleCatalogue();
    console.log('Seeding finished.');
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

runSeed();
