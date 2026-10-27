// Adds the sample data from seedData.js to the database.
// Used by "npm run seed" and by the first-time setup screen
// ("Add sample products so I can practise").
// Existing records are left alone, so it is safe to run more than once.

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const sample = require('../seedData');

// Creates each sample staff account if that username does not exist yet.
async function seedSampleUsers(log = console.log) {
  for (const item of sample.users) {
    const exists = await User.findOne({ username: item.username });
    if (exists) {
      log(`- User "${item.username}" already exists, skipped`);
      continue;
    }

    const user = new User({ name: item.name, username: item.username, role: item.role });
    await user.setPassword(item.password);
    await user.save();
    log(`+ Created ${item.role} "${item.username}" (password: ${item.password})`);
  }
}

// Creates each sample category if it does not exist yet.
// Returns an object that maps category name -> category id.
async function seedCategories(log) {
  const idByName = {};
  for (const item of sample.categories) {
    let category = await Category.findOne({ name: item.name });
    if (!category) {
      category = await Category.create(item);
      log(`+ Created category "${item.name}"`);
    }
    idByName[item.name] = category._id;
  }
  return idByName;
}

// Creates each sample product if a product with that name does not exist.
// Returns an object that maps product name -> product id.
async function seedProducts(categoryIdByName, log) {
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

  log(`+ Created ${created} product(s), ${sample.products.length - created} already existed`);
  return idByName;
}

// Creates each sample supplier if it does not exist yet.
async function seedSuppliers(productIdByName, log) {
  for (const item of sample.suppliers) {
    const exists = await Supplier.findOne({ name: item.name });
    if (exists) continue;
    await Supplier.create({
      ...item,
      products: item.products.map((name) => productIdByName[name]).filter(Boolean),
    });
    log(`+ Created supplier "${item.name}"`);
  }
}

// Creates each sample customer if their phone number is not used yet.
async function seedCustomers(log) {
  for (const item of sample.customers) {
    const exists = await Customer.findOne({ phone: item.phone });
    if (exists) continue;
    await Customer.create(item);
    log(`+ Created customer "${item.name}"`);
  }
}

// Adds the sample categories, products, suppliers and customers
// (but NOT the sample staff accounts).
async function loadSampleCatalogue(log = console.log) {
  const categoryIds = await seedCategories(log);
  const productIds = await seedProducts(categoryIds, log);
  await seedSuppliers(productIds, log);
  await seedCustomers(log);
}

module.exports = { seedSampleUsers, loadSampleCatalogue };
