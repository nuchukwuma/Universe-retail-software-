// Sample data used by seed.js. Edit these lists to change the test data.

// The sample barcodes start with 615, Nigeria's barcode country prefix.
const { makeEan13 } = require('./utils/barcodes');

// Sample staff accounts (one for each role).
// CHANGE THESE PASSWORDS before using the system in a real shop!
const users = [
  { name: 'Store Owner', username: 'owner', password: 'owner123', role: 'owner' },
  { name: 'Chidi Manager', username: 'manager', password: 'manager123', role: 'manager' },
  { name: 'Amaka Cashier', username: 'cashier', password: 'cashier123', role: 'cashier' },
];

const categories = [
  { name: 'Rice' },
  { name: 'Cooking Oil' },
  { name: 'Provisions' },
  { name: 'Spices' },
  { name: 'Home Care' },
  { name: 'Drinks' },
  { name: 'Skincare' },
];

// Each product names its category. A few have low stock, so you can see
// the low-stock warnings working.
// Products with barcode: null are for testing barcode label printing.
const products = [
  { name: 'Royal Stallion Rice 5kg', category: 'Rice', barcode: makeEan13('615000100001'), sellingPrice: 12500, quantity: 40, reorderLevel: 10 },
  { name: 'Mama Gold Rice 10kg', category: 'Rice', barcode: makeEan13('615000100002'), sellingPrice: 24000, quantity: 25, reorderLevel: 8 },
  { name: 'Local Ofada Rice 1kg', category: 'Rice', barcode: null, sellingPrice: 2500, quantity: 4, reorderLevel: 10 },
  { name: 'Power Oil 1L', category: 'Cooking Oil', barcode: makeEan13('615000200001'), sellingPrice: 3800, quantity: 60, reorderLevel: 12 },
  { name: "King's Vegetable Oil 3L", category: 'Cooking Oil', barcode: makeEan13('615000200002'), sellingPrice: 10500, quantity: 18, reorderLevel: 6 },
  { name: 'Palm Oil 1L', category: 'Cooking Oil', barcode: null, sellingPrice: 2800, quantity: 3, reorderLevel: 5 },
  { name: 'Peak Milk Powder 400g', category: 'Provisions', barcode: makeEan13('615000300001'), sellingPrice: 4200, quantity: 30, reorderLevel: 10 },
  { name: 'Milo 500g', category: 'Provisions', barcode: makeEan13('615000300002'), sellingPrice: 5500, quantity: 22, reorderLevel: 8 },
  { name: 'Indomie Chicken 70g', category: 'Provisions', barcode: makeEan13('615000300003'), sellingPrice: 350, quantity: 200, reorderLevel: 40 },
  { name: 'Golden Penny Spaghetti 500g', category: 'Provisions', barcode: makeEan13('615000300004'), sellingPrice: 1300, quantity: 80, reorderLevel: 20 },
  { name: 'Dangote Sugar 1kg', category: 'Provisions', barcode: makeEan13('615000300005'), sellingPrice: 2200, quantity: 35, reorderLevel: 10 },
  { name: 'Maggi Star Cubes (100 pcs)', category: 'Spices', barcode: makeEan13('615000400001'), sellingPrice: 1200, quantity: 50, reorderLevel: 10 },
  { name: 'Knorr Chicken Cubes (50 pcs)', category: 'Spices', barcode: makeEan13('615000400002'), sellingPrice: 1000, quantity: 45, reorderLevel: 10 },
  { name: 'Ducros Curry 10g', category: 'Spices', barcode: makeEan13('615000400003'), sellingPrice: 600, quantity: 6, reorderLevel: 8 },
  { name: 'Ducros Thyme 10g', category: 'Spices', barcode: makeEan13('615000400004'), sellingPrice: 600, quantity: 40, reorderLevel: 8 },
  { name: 'Hypo Bleach 1L', category: 'Home Care', barcode: makeEan13('615000500001'), sellingPrice: 1500, quantity: 24, reorderLevel: 6 },
  { name: 'Ariel Detergent 900g', category: 'Home Care', barcode: makeEan13('615000500002'), sellingPrice: 3000, quantity: 20, reorderLevel: 6 },
  { name: 'Morning Fresh 400ml', category: 'Home Care', barcode: makeEan13('615000500003'), sellingPrice: 1800, quantity: 2, reorderLevel: 6 },
  { name: 'Coca-Cola 50cl', category: 'Drinks', barcode: makeEan13('615000600001'), sellingPrice: 500, quantity: 120, reorderLevel: 24 },
  { name: 'Eva Water 75cl', category: 'Drinks', barcode: makeEan13('615000600002'), sellingPrice: 300, quantity: 150, reorderLevel: 24 },
  { name: 'Nivea Body Lotion 400ml', category: 'Skincare', barcode: makeEan13('615000700001'), sellingPrice: 6500, quantity: 15, reorderLevel: 4 },
  { name: 'Dove Beauty Bar 100g', category: 'Skincare', barcode: makeEan13('615000700002'), sellingPrice: 1500, quantity: 48, reorderLevel: 12 },
  { name: 'Vaseline Petroleum Jelly 250ml', category: 'Skincare', barcode: makeEan13('615000700003'), sellingPrice: 2500, quantity: 30, reorderLevel: 8 },
];

const customers = [
  { name: 'Adaeze Okafor', phone: '08034445566' },
  { name: 'Tunde Bakare', phone: '08127778899' },
  { name: 'Mama Nkechi Provisions', phone: '07061234500' },
];

module.exports = { users, categories, products, customers };
