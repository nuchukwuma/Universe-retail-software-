// Adds the sample data from seedData.js to the database.
// Used by "npm run seed" and by the first-time setup screen
// ("Add sample products so I can practise").
// Existing records are left alone, so it is safe to run more than once.

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
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
async function seedProducts(categoryIdByName, log) {
  let created = 0;

  for (const item of sample.products) {
    const exists = await Product.findOne({ name: item.name });
    if (!exists) {
      const { category, ...fields } = item;
      await Product.create({ ...fields, category: categoryIdByName[category] });
      created += 1;
    }
  }

  log(`+ Created ${created} product(s), ${sample.products.length - created} already existed`);
}

// Adds the sample categories and products
// (but NOT the sample staff accounts).
async function loadSampleCatalogue(log = console.log) {
  const categoryIds = await seedCategories(log);
  await seedProducts(categoryIds, log);
}

module.exports = { seedSampleUsers, loadSampleCatalogue };
