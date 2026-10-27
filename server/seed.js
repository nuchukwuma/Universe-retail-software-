// Adds sample data so you can test the app straight away.
// Run it with:  npm run seed
// It is safe to run more than once - existing records are left alone.
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');

// Sample staff accounts (one for each role).
// CHANGE THESE PASSWORDS before using the system in a real shop!
const sampleUsers = [
  { name: 'Store Owner', username: 'owner', password: 'owner123', role: 'owner' },
  { name: 'Chidi Manager', username: 'manager', password: 'manager123', role: 'manager' },
  { name: 'Amaka Cashier', username: 'cashier', password: 'cashier123', role: 'cashier' },
];

// Creates each sample user if that username does not exist yet.
async function seedUsers() {
  for (const sample of sampleUsers) {
    const exists = await User.findOne({ username: sample.username });
    if (exists) {
      console.log(`- User "${sample.username}" already exists, skipped`);
      continue;
    }

    const user = new User({ name: sample.name, username: sample.username, role: sample.role });
    await user.setPassword(sample.password);
    await user.save();
    console.log(`+ Created ${sample.role} "${sample.username}" (password: ${sample.password})`);
  }
}

// Connects to the database, runs every seed step, then disconnects.
async function runSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Seeding...');

    await seedUsers();

    console.log('Seeding finished.');
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

runSeed();
