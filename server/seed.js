// Adds sample data so you can test the app straight away (development).
// Run it with:  npm run seed
// It is safe to run more than once - existing records are left alone.
// (In the desktop app, the first-time setup screen can add the sample
// products instead.)
require('dotenv').config();

const connectDB = require('./config/db');
const { disconnectDB } = require('./config/db');
const { seedSampleUsers, loadSampleCatalogue } = require('./utils/sampleData');

// Opens the shop's data, adds the sample data, then closes it.
// (Stop the server first: the data can only be open in one place.)
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
    await disconnectDB();
  }
}

runSeed();
