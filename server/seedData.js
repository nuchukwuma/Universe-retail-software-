// Sample data: practice products a new shop can load (first-time setup,
// "Add sample products"), and the staff accounts used by "npm run seed".
// The sample barcodes start with 615, Nigeria's barcode country prefix.
const { makeEan13 } = require('./utils/barcodes');

// Sample staff accounts (one for each role), for development only.
// CHANGE THESE PASSWORDS before using the system in a real shop!
const users = [
  { name: 'Shop Owner', username: 'owner', password: 'owner123', role: 'owner' },
  { name: 'Chidi Manager', username: 'manager', password: 'manager123', role: 'manager' },
  { name: 'Amaka Cashier', username: 'cashier', password: 'cashier123', role: 'cashier' },
];

// A product line: [name, category, barcode digits (12, or null), selling price, cost price, stock, low at, supplier]
const p = (name, category, code, sellingPrice, costPrice, quantity, reorderLevel, supplier) => ({
  name, category, barcode: code ? makeEan13(code) : null, sellingPrice, costPrice, quantity, reorderLevel, supplier,
});

// The sample product sets ("catalogues") a shop can choose from.
const catalogues = {
  general: {
    label: 'General store',
    suppliers: [
      { name: 'Prime Foods Distributors', phone: '0803 555 0101', address: 'Mile 12 Market, Lagos' },
      { name: 'Clearwater Drinks Ltd', phone: '0805 555 0202', address: 'Ikeja, Lagos' },
      { name: 'HomeCare Wholesale', phone: '0807 555 0303', address: 'Onitsha Main Market' },
    ],
    categories: ['Groceries', 'Drinks', 'Snacks', 'Toiletries', 'Household', 'Baby'],
    products: [
      p('Golden Penny Spaghetti 500g', 'Groceries', '615000100011', 1300, 1050, 80, 20, 'Prime Foods Distributors'),
      p('Dangote Sugar 1kg', 'Groceries', '615000100012', 2200, 1850, 35, 10, 'Prime Foods Distributors'),
      p('Royal Stallion Rice 5kg', 'Groceries', '615000100013', 12500, 10900, 18, 6, 'Prime Foods Distributors'),
      p('Power Oil 1L', 'Groceries', '615000100014', 3800, 3250, 24, 8, 'Prime Foods Distributors'),
      p('Indomie Chicken 70g', 'Groceries', '615000100015', 350, 270, 200, 40, 'Prime Foods Distributors'),
      p('Peak Milk Powder 400g', 'Groceries', '615000100016', 4200, 3600, 4, 8, 'Prime Foods Distributors'),
      p('Coca-Cola 50cl', 'Drinks', '615000200011', 500, 380, 120, 24, 'Clearwater Drinks Ltd'),
      p('Eva Water 75cl', 'Drinks', '615000200012', 300, 210, 150, 24, 'Clearwater Drinks Ltd'),
      p('Chivita 100% Orange 1L', 'Drinks', '615000200013', 2400, 1950, 20, 6, 'Clearwater Drinks Ltd'),
      p('Malta Guinness Can', 'Drinks', '615000200014', 700, 560, 0, 12, 'Clearwater Drinks Ltd'),
      p('Gala Sausage Roll', 'Snacks', '615000300011', 300, 230, 60, 20, 'Prime Foods Distributors'),
      p('Pringles Original 165g', 'Snacks', '615000300012', 3500, 2900, 12, 4, 'Prime Foods Distributors'),
      p('Plantain Chips (local)', 'Snacks', null, 500, 300, 30, 10, null),
      p('Dove Beauty Bar 100g', 'Toiletries', '615000400011', 1500, 1180, 48, 12, 'HomeCare Wholesale'),
      p('Close Up Toothpaste 140g', 'Toiletries', '615000400012', 1400, 1100, 30, 10, 'HomeCare Wholesale'),
      p('Nivea Body Lotion 400ml', 'Toiletries', '615000400013', 6500, 5300, 15, 4, 'HomeCare Wholesale'),
      p('Ariel Detergent 900g', 'Household', '615000500011', 3000, 2450, 20, 6, 'HomeCare Wholesale'),
      p('Morning Fresh 400ml', 'Household', '615000500012', 1800, 1450, 2, 6, 'HomeCare Wholesale'),
      p('Hypo Bleach 1L', 'Household', '615000500013', 1500, 1150, 24, 6, 'HomeCare Wholesale'),
      p('Pampers Baby Dry Size 4', 'Baby', '615000600011', 9500, 8100, 10, 3, 'HomeCare Wholesale'),
      p('Cerelac Wheat 400g', 'Baby', '615000600012', 4800, 4050, 9, 3, 'Prime Foods Distributors'),
    ],
  },
  beauty: {
    label: 'Beauty and cosmetics',
    suppliers: [
      { name: 'Glow Beauty Wholesale', phone: '0803 555 0404', address: 'Balogun Market, Lagos' },
      { name: 'Naija Hair Supplies', phone: '0806 555 0505', address: 'Ikeja, Lagos' },
    ],
    categories: ['Skincare', 'Body care', 'Make-up', 'Hair care', 'Fragrance', "Men's grooming"],
    products: [
      p('CeraVe Hydrating Cleanser 236ml', 'Skincare', '615000100001', 18500, 15200, 14, 4, 'Glow Beauty Wholesale'),
      p('Nivea Soft Cream 200ml', 'Skincare', '615000100002', 4500, 3600, 30, 8, 'Glow Beauty Wholesale'),
      p('The Ordinary Niacinamide 10% + Zinc 30ml', 'Skincare', '615000100003', 14000, 11300, 9, 4, 'Glow Beauty Wholesale'),
      p('African Black Soap 250g', 'Skincare', null, 3500, 2200, 12, 6, null),
      p('Vaseline Cocoa Radiant Lotion 400ml', 'Body care', '615000200002', 5800, 4700, 26, 6, 'Glow Beauty Wholesale'),
      p("Palmer's Cocoa Butter Formula 250g", 'Body care', '615000200004', 8500, 6900, 11, 4, 'Glow Beauty Wholesale'),
      p('Maybelline Fit Me Foundation 30ml', 'Make-up', '615000300001', 12500, 9900, 16, 5, 'Glow Beauty Wholesale'),
      p('Zaron Pressed Powder', 'Make-up', '615000300002', 9000, 7100, 2, 4, 'Glow Beauty Wholesale'),
      p('Maybelline Lash Sensational Mascara', 'Make-up', '615000300004', 11000, 8800, 0, 4, 'Glow Beauty Wholesale'),
      p('Cantu Shea Butter Leave-In Conditioner 340g', 'Hair care', '615000400001', 9800, 7900, 15, 5, 'Naija Hair Supplies'),
      p('Palm Kernel Oil 250ml', 'Hair care', '615000400004', 3000, 1900, 18, 6, 'Naija Hair Supplies'),
      p('Arabian Oud Perfume Oil 12ml', 'Fragrance', '615000500001', 7500, 5200, 10, 3, 'Glow Beauty Wholesale'),
      p('Nivea Men Roll-on 50ml', "Men's grooming", '615000600001', 3200, 2550, 40, 10, 'Glow Beauty Wholesale'),
    ],
  },
};

module.exports = { users, catalogues };
