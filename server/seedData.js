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
  { name: 'Skincare' },
  { name: 'Body care' },
  { name: 'Make-up' },
  { name: 'Hair care' },
  { name: 'Fragrance' },
  { name: "Men's grooming" },
];

// Each product names its category. A few have low stock (and one has none),
// so you can see the low-stock warnings working. Products with
// barcode: null show up under "No barcode yet" on the Products page.
const products = [
  { name: 'CeraVe Hydrating Cleanser 236ml', category: 'Skincare', barcode: makeEan13('615000100001'), sellingPrice: 18500, quantity: 14, reorderLevel: 4 },
  { name: 'Nivea Soft Cream 200ml', category: 'Skincare', barcode: makeEan13('615000100002'), sellingPrice: 4500, quantity: 30, reorderLevel: 8 },
  { name: 'The Ordinary Niacinamide 10% + Zinc 30ml', category: 'Skincare', barcode: makeEan13('615000100003'), sellingPrice: 14000, quantity: 9, reorderLevel: 4 },
  { name: 'Neutrogena Hydro Boost Gel 50ml', category: 'Skincare', barcode: makeEan13('615000100004'), sellingPrice: 16500, quantity: 3, reorderLevel: 4 },
  { name: 'Simple Micellar Water 400ml', category: 'Skincare', barcode: makeEan13('615000100005'), sellingPrice: 9500, quantity: 18, reorderLevel: 6 },
  { name: 'African Black Soap 250g', category: 'Skincare', barcode: null, sellingPrice: 3500, quantity: 12, reorderLevel: 6 },
  { name: 'Nivea Body Lotion 400ml', category: 'Body care', barcode: makeEan13('615000200001'), sellingPrice: 6500, quantity: 22, reorderLevel: 6 },
  { name: 'Vaseline Cocoa Radiant Lotion 400ml', category: 'Body care', barcode: makeEan13('615000200002'), sellingPrice: 5800, quantity: 26, reorderLevel: 6 },
  { name: 'Dove Beauty Bar 100g', category: 'Body care', barcode: makeEan13('615000200003'), sellingPrice: 1500, quantity: 48, reorderLevel: 12 },
  { name: "Palmer's Cocoa Butter Formula 250g", category: 'Body care', barcode: makeEan13('615000200004'), sellingPrice: 8500, quantity: 11, reorderLevel: 4 },
  { name: 'Raw Shea Butter 500g', category: 'Body care', barcode: null, sellingPrice: 4000, quantity: 5, reorderLevel: 6 },
  { name: 'Maybelline Fit Me Foundation 30ml', category: 'Make-up', barcode: makeEan13('615000300001'), sellingPrice: 12500, quantity: 16, reorderLevel: 5 },
  { name: 'Zaron Pressed Powder', category: 'Make-up', barcode: makeEan13('615000300002'), sellingPrice: 9000, quantity: 2, reorderLevel: 4 },
  { name: 'House of Tara Lip Gloss', category: 'Make-up', barcode: makeEan13('615000300003'), sellingPrice: 6000, quantity: 20, reorderLevel: 5 },
  { name: 'Maybelline Lash Sensational Mascara', category: 'Make-up', barcode: makeEan13('615000300004'), sellingPrice: 11000, quantity: 0, reorderLevel: 4 },
  { name: 'Cantu Shea Butter Leave-In Conditioner 340g', category: 'Hair care', barcode: makeEan13('615000400001'), sellingPrice: 9800, quantity: 15, reorderLevel: 5 },
  { name: 'ORS Olive Oil Hair Lotion 250ml', category: 'Hair care', barcode: makeEan13('615000400002'), sellingPrice: 5200, quantity: 20, reorderLevel: 6 },
  { name: 'Dark and Lovely Relaxer Kit', category: 'Hair care', barcode: makeEan13('615000400003'), sellingPrice: 4800, quantity: 24, reorderLevel: 6 },
  { name: 'Arabian Oud Perfume Oil 12ml', category: 'Fragrance', barcode: makeEan13('615000500001'), sellingPrice: 7500, quantity: 10, reorderLevel: 3 },
  { name: 'Vanilla Body Mist 250ml', category: 'Fragrance', barcode: makeEan13('615000500002'), sellingPrice: 12000, quantity: 6, reorderLevel: 3 },
  { name: 'Nivea Men Roll-on 50ml', category: "Men's grooming", barcode: makeEan13('615000600001'), sellingPrice: 3200, quantity: 40, reorderLevel: 10 },
  { name: 'Gillette Mach3 Razor', category: "Men's grooming", barcode: makeEan13('615000600002'), sellingPrice: 7000, quantity: 12, reorderLevel: 4 },
];

module.exports = { users, categories, products };
