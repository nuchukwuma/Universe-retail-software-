// Adds sample data so you can test the app straight away.
// Run it with:  npm run seed
// It is safe to run more than once - existing records are left alone.
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const sample = require('./seedData');

// Creates each sample user if that username does not exist yet.
async function seedUsers() {
  for (const item of sample.users) {
    const exists = await User.findOne({ username: item.username });
    if (exists) {
      console.log(`- User "${item.username}" already exists, skipped`);
      continue;
    }

    const user = new User({ name: item.name, username: item.username, role: item.role });
    await user.setPassword(item.password);
    await user.save();
    console.log(`+ Created ${item.role} "${item.username}" (password: ${item.password})`);
  }
}

// Creates each sample category if it does not exist yet.
// Returns an object that maps category name -> category id.
async function seedCategories() {
  const idByName = {};

  for (const item of sample.categories) {
    let category = await Category.findOne({ name: item.name });
    if (!category) {
      category = await Category.create(item);
      console.log(`+ Created category "${item.name}"`);
    }
    idByName[item.name] = category._id;
  }

  return idByName;
}

// Creates each sample product if a product with that name does not exist.
// Returns an object that maps product name -> product id.
async function seedProducts(categoryIdByName) {
  const idByName = {};
  let created = 0;

  for (const item of sample.products) {
    let product = await Product.findOne({ name: item.name });
    if (!product) {
      const { expiryDays, category, ...fields } = item;
      product = await Product.create({
        ...fields,
        category: categoryIdByName[category],
        expiryDate: expiryDays === undefined ? null : sample.daysFromNow(expiryDays),
      });
      created += 1;
    }
    idByName[item.name] = product._id;
  }

  console.log(`+ Created ${created} product(s), ${sample.products.length - created} already existed`);
  return idByName;
}

// Creates each sample supplier if it does not exist yet.
async function seedSuppliers(productIdByName) {
  for (const item of sample.suppliers) {
    const exists = await Supplier.findOne({ name: item.name });
    if (exists) continue;

    await Supplier.create({
      ...item,
      products: item.products.map((name) => productIdByName[name]).filter(Boolean),
    });
    console.log(`+ Created supplier "${item.name}"`);
  }
}

// Connects to the database, runs every seed step, then disconnects.
async function runSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB. Seeding...');

    await seedUsers();
    const categoryIds = await seedCategories();
    const productIds = await seedProducts(categoryIds);
    await seedSuppliers(productIds);

    console.log('Seeding finished.');
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

runSeed();
