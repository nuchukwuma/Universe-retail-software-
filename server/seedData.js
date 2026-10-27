// Sample data used by seed.js. Edit these lists to change the test data.

// Returns a date "days" days from today (negative = in the past).
function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Builds a valid 13-digit EAN barcode from 12 digits by adding the
// check digit at the end. (615 is Nigeria's barcode country prefix.)
function makeEan13(twelveDigits) {
  const sum = twelveDigits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return twelveDigits + checkDigit;
}

// Sample staff accounts (one for each role).
// CHANGE THESE PASSWORDS before using the system in a real shop!
const users = [
  { name: 'Store Owner', username: 'owner', password: 'owner123', role: 'owner' },
  { name: 'Chidi Manager', username: 'manager', password: 'manager123', role: 'manager' },
  { name: 'Amaka Cashier', username: 'cashier', password: 'cashier123', role: 'cashier' },
];

const categories = [
  { name: 'Rice', icon: '🍚' },
  { name: 'Cooking Oil', icon: '🫒' },
  { name: 'Provisions', icon: '🥫' },
  { name: 'Spices', icon: '🌶️' },
  { name: 'Home Care', icon: '🧽' },
  { name: 'Drinks', icon: '🥤' },
  { name: 'Skincare', icon: '🧴' },
];

// Each product names its category. A few have low stock or an
// expiry date that is close, so you can see the alerts working.
// Products with barcode: null are for testing barcode label printing.
const products = [
  { name: 'Royal Stallion Rice 5kg', category: 'Rice', barcode: makeEan13('615000100001'), costPrice: 10500, sellingPrice: 12500, wholesalePrice: 12000, quantity: 40, reorderLevel: 10 },
  { name: 'Mama Gold Rice 10kg', category: 'Rice', barcode: makeEan13('615000100002'), costPrice: 20500, sellingPrice: 24000, wholesalePrice: 23000, quantity: 25, reorderLevel: 8 },
  { name: 'Local Ofada Rice 1kg', category: 'Rice', barcode: null, costPrice: 1900, sellingPrice: 2500, quantity: 4, reorderLevel: 10 },
  { name: 'Power Oil 1L', category: 'Cooking Oil', barcode: makeEan13('615000200001'), costPrice: 3200, sellingPrice: 3800, wholesalePrice: 3600, quantity: 60, reorderLevel: 12 },
  { name: "King's Vegetable Oil 3L", category: 'Cooking Oil', barcode: makeEan13('615000200002'), costPrice: 9000, sellingPrice: 10500, wholesalePrice: 10000, quantity: 18, reorderLevel: 6 },
  { name: 'Palm Oil 1L', category: 'Cooking Oil', barcode: null, costPrice: 2200, sellingPrice: 2800, quantity: 3, reorderLevel: 5 },
  { name: 'Peak Milk Powder 400g', category: 'Provisions', barcode: makeEan13('615000300001'), costPrice: 3600, sellingPrice: 4200, quantity: 30, reorderLevel: 10, expiryDays: 240 },
  { name: 'Milo 500g', category: 'Provisions', barcode: makeEan13('615000300002'), costPrice: 4700, sellingPrice: 5500, quantity: 22, reorderLevel: 8, expiryDays: 300 },
  { name: 'Indomie Chicken 70g', category: 'Provisions', barcode: makeEan13('615000300003'), costPrice: 280, sellingPrice: 350, wholesalePrice: 320, quantity: 200, reorderLevel: 40, expiryDays: 20 },
  { name: 'Golden Penny Spaghetti 500g', category: 'Provisions', barcode: makeEan13('615000300004'), costPrice: 1050, sellingPrice: 1300, quantity: 80, reorderLevel: 20, expiryDays: 180 },
  { name: 'Dangote Sugar 1kg', category: 'Provisions', barcode: makeEan13('615000300005'), costPrice: 1800, sellingPrice: 2200, quantity: 35, reorderLevel: 10 },
  { name: 'Maggi Star Cubes (100 pcs)', category: 'Spices', barcode: makeEan13('615000400001'), costPrice: 950, sellingPrice: 1200, quantity: 50, reorderLevel: 10, expiryDays: 365 },
  { name: 'Knorr Chicken Cubes (50 pcs)', category: 'Spices', barcode: makeEan13('615000400002'), costPrice: 800, sellingPrice: 1000, quantity: 45, reorderLevel: 10, expiryDays: 12 },
  { name: 'Ducros Curry 10g', category: 'Spices', barcode: makeEan13('615000400003'), costPrice: 450, sellingPrice: 600, quantity: 6, reorderLevel: 8 },
  { name: 'Ducros Thyme 10g', category: 'Spices', barcode: makeEan13('615000400004'), costPrice: 450, sellingPrice: 600, quantity: 40, reorderLevel: 8 },
  { name: 'Hypo Bleach 1L', category: 'Home Care', barcode: makeEan13('615000500001'), costPrice: 1200, sellingPrice: 1500, quantity: 24, reorderLevel: 6 },
  { name: 'Ariel Detergent 900g', category: 'Home Care', barcode: makeEan13('615000500002'), costPrice: 2500, sellingPrice: 3000, quantity: 20, reorderLevel: 6 },
  { name: 'Morning Fresh 400ml', category: 'Home Care', barcode: makeEan13('615000500003'), costPrice: 1450, sellingPrice: 1800, quantity: 2, reorderLevel: 6 },
  { name: 'Coca-Cola 50cl', category: 'Drinks', barcode: makeEan13('615000600001'), costPrice: 400, sellingPrice: 500, wholesalePrice: 450, quantity: 120, reorderLevel: 24, expiryDays: 90 },
  { name: 'Eva Water 75cl', category: 'Drinks', barcode: makeEan13('615000600002'), costPrice: 220, sellingPrice: 300, wholesalePrice: 260, quantity: 150, reorderLevel: 24 },
  { name: 'Nivea Body Lotion 400ml', category: 'Skincare', barcode: makeEan13('615000700001'), costPrice: 5400, sellingPrice: 6500, quantity: 15, reorderLevel: 4, expiryDays: 500 },
  { name: 'Dove Beauty Bar 100g', category: 'Skincare', barcode: makeEan13('615000700002'), costPrice: 1200, sellingPrice: 1500, quantity: 48, reorderLevel: 12 },
  { name: 'Vaseline Petroleum Jelly 250ml', category: 'Skincare', barcode: makeEan13('615000700003'), costPrice: 2000, sellingPrice: 2500, quantity: 30, reorderLevel: 8, expiryDays: -5 },
];

// Each supplier lists the names of the products they supply.
const suppliers = [
  { name: 'Mainland Foods Distributors', phone: '08031234567', address: 'Mile 12 Market, Lagos', products: ['Royal Stallion Rice 5kg', 'Mama Gold Rice 10kg', 'Dangote Sugar 1kg', 'Golden Penny Spaghetti 500g'] },
  { name: 'Eko Oil & Provisions Ltd', phone: '08059876543', address: 'Idumota, Lagos Island', products: ['Power Oil 1L', "King's Vegetable Oil 3L", 'Peak Milk Powder 400g', 'Milo 500g', 'Indomie Chicken 70g'] },
  { name: 'Glow Beauty Wholesale', phone: '09021112233', address: 'Trade Fair Complex, Ojo', products: ['Nivea Body Lotion 400ml', 'Dove Beauty Bar 100g', 'Vaseline Petroleum Jelly 250ml'] },
];

module.exports = { users, categories, products, suppliers, daysFromNow };
