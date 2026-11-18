// HordeDesk's browser demo: the real server code (routes, models, reports)
// running inside the web page, with the shop's data kept in this browser.
// build.mjs bundles this file with esbuild; the client's demo build calls
// handle() instead of sending requests over the network.
const express = require('express');
const db = require('../../server/db');
const { Store } = require('../../server/db/store'); // the browser store (see build.mjs)
const { PREFIX: IMAGE_PREFIX } = require('../../server/utils/images');
const User = require('../../server/models/User');
const Product = require('../../server/models/Product');

const ROUTES = {
  '/auth': require('../../server/routes/authRoutes'),
  '/setup': require('../../server/routes/setupRoutes'),
  '/users': require('../../server/routes/userRoutes'),
  '/categories': require('../../server/routes/categoryRoutes'),
  '/products': require('../../server/routes/productRoutes'),
  '/stock': require('../../server/routes/stockRoutes'),
  '/sales': require('../../server/routes/saleRoutes'),
  '/returns': require('../../server/routes/returnRoutes'),
  '/held-bills': require('../../server/routes/heldBillRoutes'),
  '/settings': require('../../server/routes/settingsRoutes'),
  '/reports': [require('../../server/routes/reportRoutes'), require('../../server/routes/managerReportRoutes')],
  '/telegram': require('../../server/routes/telegramRoutes'),
  '/backups': require('../../server/routes/backupRoutes'),
  '/suppliers': require('../../server/routes/supplierRoutes'),
  '/purchases': require('../../server/routes/purchaseRoutes'),
};

const NOT_IN_DEMO = {
  '/backups': 'Backups are made by the desktop app. This demo keeps its data in your browser.',
  '/telegram': 'Telegram alerts are sent by the desktop app, not the demo.',
};

// The demo's staff, one per role (the role switcher signs in as them).
const STAFF = {
  owner: { username: 'owner', password: 'owner123' },
  manager: { username: 'manager', password: 'manager123' },
  cashier: { username: 'cashier', password: 'cashier123' },
};

const api = express.Router();
api.get('/health', (req, res) => res.json({ status: 'ok', demo: true }));
Object.entries(ROUTES).forEach(([prefix, routers]) => {
  [].concat(routers).forEach((router) => api.use(prefix, router));
});

let store = null;

// Answers one API request: { method, url ('/api/...'), body, headers }.
async function handle({ method = 'GET', url, body, headers = {} }) {
  const parsed = new URL(url, 'http://demo');
  const path = parsed.pathname.replace(/^\/api/, '') || '/';
  const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const res = {
    statusCode: 200,
    finished: false,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set() {
      return this;
    },
    json(value) {
      this.body = value === undefined ? null : JSON.parse(JSON.stringify(value));
      this.finished = true;
      return this;
    },
    send(value) {
      return this.json(value);
    },
  };
  const blocked = Object.keys(NOT_IN_DEMO).find((p) => path.startsWith(p) && method !== 'GET');
  if (blocked) return { status: 400, body: { message: NOT_IN_DEMO[blocked] } };

  const req = {
    method: method.toUpperCase(),
    url: parsed.pathname + parsed.search,
    path,
    query: Object.fromEntries(parsed.searchParams.entries()),
    body: body || {},
    headers: lowerHeaders,
    params: {},
  };
  try {
    const answered = await api.dispatch(req, res, path);
    if (!answered && !res.finished) res.status(404).json({ message: 'API route not found.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Something went wrong.' });
  }
  return { status: res.statusCode, body: res.body };
}

// Shortcut for the seeding below.
async function call(method, url, body, token) {
  const result = await handle({ method, url: `/api${url}`, body, headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (result.status >= 400) throw new Error(`${method} ${url}: ${result.body && result.body.message}`);
  return result.body;
}

// A login token for one of the demo's roles.
async function loginAs(role) {
  const staff = STAFF[role] || STAFF.owner;
  return (await call('POST', '/auth/login', staff)).token;
}

// ---------- The demo shop: sample products and 30 days of trading ----------

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // reports use Lagos time (UTC+1)

// A random whole number from min to max.
function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// The date "daysAgo" days before today (Lagos), at hour:minute Lagos time.
function lagosTime(daysAgo, hour, minute) {
  const lagosNow = new Date(Date.now() + LAGOS_OFFSET_MS);
  return new Date(Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate() - daysAgo, hour, minute) - LAGOS_OFFSET_MS);
}

function yymmdd(date) {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return lagos.toISOString().slice(2, 10).replace(/-/g, '');
}

// Moves a record (and its stock movements) back to an earlier time.
function backdate(table, id, when, changes = {}) {
  const record = store.get(table, id);
  if (record) store.put(table, { ...record, ...changes, createdAt: when, updatedAt: when });
}

async function seedShop() {
  await call('POST', '/setup', {
    storeName: 'Corner Mart',
    ownerName: 'Shop Owner',
    username: STAFF.owner.username,
    password: STAFF.owner.password,
    securityQuestions: [
      { question: 'What was the name of your first school?', answer: 'demo' },
      { question: 'In which town were you born?', answer: 'demo' },
      { question: 'What is your favourite food?', answer: 'demo' },
    ],
    loadSampleData: 'general',
  });
  const owner = await loginAs('owner');
  await call('PUT', '/settings', { address: '14 Market Road, Yaba, Lagos', phone: '0803 555 0199', footerMessage: 'Thank you for shopping with us!' }, owner);
  await call('POST', '/users', { name: 'Chidi Okafor', username: 'manager', password: STAFF.manager.password, role: 'manager' }, owner);
  await call('POST', '/users', { name: 'Amaka Eze', username: 'cashier', password: STAFF.cashier.password, role: 'cashier' }, owner);
  const cashier = await loginAs('cashier');
  const manager = await loginAs('manager');

  const products = await call('GET', '/products', null, owner);
  const startQuantities = new Map(products.map((p) => [p._id, p.quantity]));
  // Everyday items sell more often than big-ticket ones.
  const weighted = products.flatMap((p) => Array(p.sellingPrice <= 1500 ? 4 : p.sellingPrice <= 4000 ? 2 : 1).fill(p));
  const lagosHourNow = new Date(Date.now() + LAGOS_OFFSET_MS).getUTCHours();

  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const weekday = lagosTime(daysAgo, 12, 0).getUTCDay();
    let count = rand(9, 18) + (weekday === 6 ? 8 : 0) + (weekday === 0 ? -4 : 0);
    const lastHour = daysAgo === 0 ? Math.min(20, lagosHourNow - 1) : 20;
    if (lastHour < 8) count = 0;
    else if (daysAgo === 0) count = Math.round((count * (lastHour - 8)) / 12);
    const times = Array.from({ length: count }, () => [rand(8, lastHour), rand(0, 59)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    for (let i = 0; i < times.length; i += 1) {
      const lines = new Map();
      const size = rand(1, 4);
      while (lines.size < size) {
        const product = weighted[rand(0, weighted.length - 1)];
        lines.set(product._id, { productId: product._id, quantity: rand(1, product.sellingPrice <= 1000 ? 4 : 2) });
      }
      const token = i % 5 === 4 ? manager : cashier;
      const sale = await call('POST', '/sales', { items: [...lines.values()] }, token);
      const when = lagosTime(daysAgo, times[i][0], times[i][1]);
      const receiptNumber = `${yymmdd(when)}-${String(i + 1).padStart(4, '0')}`;
      backdate('sales', sale._id, when, { receiptNumber });
      store.all('stockmovements')
        .filter((m) => m.note === `Receipt ${sale.receiptNumber}`)
        .forEach((m) => backdate('stockmovements', m._id, when, { note: `Receipt ${receiptNumber}` }));
    }
  }

  // Today's next receipt follows on from today's sample sales.
  const todayCode = yymmdd(new Date());
  const todayCount = store.all('sales').filter((s) => s.receiptNumber.startsWith(`${todayCode}-`)).length;
  store.put('counters', { _id: `receipt-${todayCode}`, value: todayCount });

  // Shelf stock as the sample set has it (so "running low" has examples).
  for (const [id, quantity] of startQuantities) {
    await Product.findByIdAndUpdate(id, { $set: { quantity } });
  }

  // Purchase orders: one delivered last week, one still to come.
  const suppliers = await call('GET', '/suppliers', null, owner);
  const byName = (name) => suppliers.find((s) => s.name === name);
  const productNamed = (start) => products.find((p) => p.name.startsWith(start));
  const delivered = await call('POST', '/purchases', {
    supplierId: byName('Clearwater Drinks Ltd')._id,
    items: [
      { productId: productNamed('Coca-Cola')._id, quantity: 48, unitCost: 380 },
      { productId: productNamed('Eva Water')._id, quantity: 60, unitCost: 210 },
    ],
  }, manager);
  const receivedOrder = (await call('POST', `/purchases/${delivered._id}/receive`, {}, manager)).purchase;
  const orderedOn = lagosTime(6, 10, 15);
  backdate('purchases', receivedOrder._id, orderedOn, { receivedAt: lagosTime(5, 14, 30), purchaseNumber: `P${yymmdd(orderedOn)}-0001` });
  store.put('counters', { _id: `purchase-${todayCode}`, value: 0 });
  await call('POST', '/purchases', {
    supplierId: byName('Prime Foods Distributors')._id,
    items: [
      { productId: productNamed('Peak Milk')._id, quantity: 12, unitCost: 3600 },
      { productId: productNamed('Indomie')._id, quantity: 120, unitCost: 270 },
      { productId: productNamed('Cerelac')._id, quantity: 6, unitCost: 4050 },
    ],
    expectedDate: lagosTime(-3, 12, 0).toISOString().slice(0, 10),
    notes: 'Deliver before noon',
  }, owner);
}

// Opens the demo's data, setting the shop up on the first visit.
let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      process.env.JWT_SECRET = 'demo';
      store = db.openStore('/demo');
      if ((await User.countDocuments()) === 0) {
        store.paused = true;
        try {
          await seedShop();
        } finally {
          store.paused = false;
          store.save();
        }
      }
    })();
  }
  return readyPromise;
}

// Forgets everything the visitor did (the next ready() sets the shop up again).
function reset() {
  Store.clearAll();
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(IMAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

module.exports = { handle, ready, loginAs, reset, STAFF };
