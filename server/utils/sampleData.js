// Adds the sample data from seedData.js to the database.
// Used by "npm run seed" and by the first-time setup screen
// ("Add sample products so I can practise").
// Existing records are left alone, so it is safe to run more than once.

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
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
async function seedCategories(names, log) {
  const idByName = {};
  for (const name of names) {
    let category = await Category.findOne({ name });
    if (!category) {
      category = await Category.create({ name });
      log(`+ Created category "${name}"`);
    }
    idByName[name] = category._id;
  }
  return idByName;
}

// Creates each sample supplier if it does not exist yet.
// Returns an object that maps supplier name -> supplier id.
async function seedSuppliers(list, log) {
  const idByName = {};
  for (const item of list) {
    let supplier = await Supplier.findOne({ name: item.name });
    if (!supplier) {
      supplier = await Supplier.create(item);
      log(`+ Created supplier "${item.name}"`);
    }
    idByName[item.name] = supplier._id;
  }
  return idByName;
}

// Creates each sample product if a product with that name does not exist.
async function seedProducts(products, categoryIds, supplierIds, log) {
  let created = 0;
  for (const item of products) {
    if (await Product.findOne({ name: item.name })) continue;
    const { category, supplier, ...fields } = item;
    await Product.create({ ...fields, category: categoryIds[category], supplier: supplier ? supplierIds[supplier] : null });
    created += 1;
  }
  log(`+ Created ${created} product(s), ${products.length - created} already existed`);
}

// The sample sets a shop can choose from: [{ key, label }].
function sampleCatalogueChoices() {
  return Object.entries(sample.catalogues).map(([key, catalogue]) => ({ key, label: catalogue.label }));
}

// Adds one sample set's suppliers, categories and products
// (but NOT the sample staff accounts). "key" is 'general' or 'beauty'.
async function loadSampleCatalogue(key = 'general', log = console.log) {
  const catalogue = sample.catalogues[key] || sample.catalogues.general;
  const supplierIds = await seedSuppliers(catalogue.suppliers, log);
  const categoryIds = await seedCategories(catalogue.categories, log);
  await seedProducts(catalogue.products, categoryIds, supplierIds, log);
}

module.exports = { seedSampleUsers, loadSampleCatalogue, sampleCatalogueChoices };
