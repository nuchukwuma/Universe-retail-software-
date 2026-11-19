// Tests the licence server with Paystack faked, and checks that the keys it
// signs are accepted by the app's own licence check.
import assert from 'node:assert';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import worker from '../src/index.js';

const require = createRequire(import.meta.url);
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const env = {
  PAYSTACK_SECRET_KEY: 'sk_test_x',
  LICENCE_PRIVATE_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  PAYSTACK_PLAN_CODE: 'PLN_test',
  SITE_URL: 'https://example.github.io/shop/',
  DOWNLOAD_URL: 'https://example.com/HordeDesk-Setup.exe',
};

// Fake Paystack.
const calls = [];
let subscriptions = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init });
  assert.strictEqual(init.headers.Authorization, 'Bearer sk_test_x');
  const u = new URL(url);
  const reply = (data, status = 200) => new Response(JSON.stringify({ status: status < 400, message: data.message, data }), { status });
  if (u.pathname === '/transaction/initialize') {
    const body = JSON.parse(init.body);
    assert.strictEqual(body.amount, 500000); assert.strictEqual(body.plan, 'PLN_test');
    return reply({ authorization_url: 'https://checkout.paystack.com/abc', reference: 'ref1' });
  }
  if (u.pathname === '/transaction/verify/ref1') {
    return reply({ status: 'success', amount: 500000, paid_at: '2026-11-19T10:00:00Z', metadata: { shop: 'Corner Mart' }, customer: { id: 7, customer_code: 'CUS_abc123', email: 'ada@example.com' } });
  }
  if (u.pathname === '/transaction/verify/ref2') return reply({ status: 'abandoned', amount: 500000, customer: {} });
  if (u.pathname === '/customer/CUS_abc123') return reply({ id: 7, customer_code: 'CUS_abc123', email: 'ada@example.com' });
  if (u.pathname === '/subscription') return reply(subscriptions);
  return reply({ message: 'not found' }, 404);
};

const call = (method, path, body) => worker.fetch(new Request(`https://licence.example.workers.dev${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json' } }), env);

// The app's check, with the test key's public half.
function appReads(key) {
  const [a, b, c] = key.split('.');
  const ok = crypto.verify(null, Buffer.from(`${a}.${b}`), publicKey, Buffer.from(c, 'base64url'));
  assert.ok(ok, 'signature accepted');
  return JSON.parse(Buffer.from(b, 'base64url'));
}

// Pay
assert.strictEqual((await (await call('POST', '/pay', { email: 'nope', shop: 'x' })).json()).message, 'Enter a valid email address.');
let r = await call('POST', '/pay', { email: 'ada@example.com', shop: 'Corner Mart' });
assert.strictEqual(r.status, 200); assert.strictEqual((await r.json()).url, 'https://checkout.paystack.com/abc');
assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), 'https://example.github.io');
assert.strictEqual(JSON.parse(calls.at(-1).init.body).callback_url, 'https://licence.example.workers.dev/paid');
console.log('ok /pay starts a ₦5,000 monthly Paystack payment');

// Paid
r = await call('GET', '/paid?reference=ref1');
const html = await r.text();
assert.strictEqual(r.status, 200);
const key = html.match(/HD1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)[0];
let details = appReads(key);
assert.strictEqual(details.id, 'CUS_abc123'); assert.strictEqual(details.shop, 'Corner Mart'); assert.strictEqual(details.plan, 'monthly');
assert.strictEqual(details.exp, new Date(Date.parse('2026-11-19T10:00:00Z') + 31 * 86400000).toISOString());
assert.ok(html.includes('https://example.com/HordeDesk-Setup.exe'));
r = await call('GET', '/paid?reference=ref2'); assert.strictEqual(r.status, 402);
console.log('ok /paid checks the payment and shows a key the app accepts, with the download');

// Renew
assert.strictEqual((await call('POST', '/renew', { licenceId: 'x' })).status, 400);
subscriptions = [];
r = await call('POST', '/renew', { licenceId: 'CUS_abc123', shop: 'Corner Mart' }); assert.strictEqual(r.status, 402);
const next = new Date(Date.now() + 20 * 86400000).toISOString();
subscriptions = [{ status: 'active', next_payment_date: next }, { status: 'cancelled', next_payment_date: '2030-01-01T00:00:00Z' }];
r = await call('POST', '/renew', { licenceId: 'CUS_abc123', shop: 'Corner Mart' });
details = appReads((await r.json()).key);
assert.strictEqual(details.exp, new Date(Date.parse(next) + 86400000).toISOString()); assert.strictEqual(details.shop, 'Corner Mart');
console.log('ok /renew gives a key up to the next payment date of an active subscription (not a cancelled one)');

// The real app accepts a key signed with the real private key (when it is on this computer).
try {
  const fs = await import('node:fs');
  const realKey = fs.readFileSync(new URL('../keys/private-key.txt', import.meta.url), 'utf8');
  const realEnv = { ...env, LICENCE_PRIVATE_KEY: realKey };
  const k = (await (await worker.fetch(new Request('https://x/paid?reference=ref1'), realEnv)).text()).match(/HD1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)[0];
  const { readLicenceKey } = require('../../server/utils/licence.js');
  assert.strictEqual(readLicenceKey(k).id, 'CUS_abc123');
  console.log('ok a key from the worker (real private key) is accepted by the app');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('(skipped: the real private key is not on this computer)');
}
console.log('ALL LICENCE SERVER CHECKS PASSED');
