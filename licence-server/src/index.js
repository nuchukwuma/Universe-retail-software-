// The HordeDesk licence server: a Cloudflare Worker (free plan is enough).
// It takes the ₦5,000 monthly payment with Paystack and hands out signed
// licence keys. It keeps no database: Paystack holds the customers and
// their subscriptions, and each key carries what the app needs.
//
//   POST /pay     { email, shop }  -> { url }   start a Paystack payment (monthly plan)
//   GET  /paid?reference=...       -> page      after paying: the licence key + download
//   POST /renew   { licenceId, shop } -> { key } next month's key, if the subscription is paid
//   GET  /health                   -> { ok }
//
// Settings (wrangler.toml [vars] and secrets):
//   PAYSTACK_SECRET_KEY  secret  Paystack secret key (sk_live_... or sk_test_...)
//   LICENCE_PRIVATE_KEY  secret  the Ed25519 private key (base64 PKCS8) that signs licences
//   PAYSTACK_PLAN_CODE   var     the ₦5,000 monthly plan made in Paystack (PLN_...)
//   SITE_URL             var     the website, e.g. https://<user>.github.io/<repo>/
//   DOWNLOAD_URL         var     the Windows installer download link

const PAYSTACK = 'https://api.paystack.co';
const PRICE_KOBO = 500000; // ₦5,000
const MONTH_DAYS = 31;
const DAY = 86400000;

// ---------- small helpers ----------

function base64url(bytes) {
  let text = '';
  new Uint8Array(bytes).forEach((b) => { text += String.fromCharCode(b); });
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(text) {
  const raw = atob(text.trim());
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cors(env) {
  const origin = env.SITE_URL ? new URL(env.SITE_URL).origin : '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(env) } });
}

async function paystack(env, method, path, body) {
  const response = await fetch(`${PAYSTACK}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === false) throw new Error(data.message || `Paystack replied ${response.status}`);
  return data.data;
}

// ---------- licence keys ----------

// Signs a licence: HD1.<details>.<signature> (the same shape the app reads,
// see server/utils/licence.js).
async function signLicence(env, details) {
  const key = await crypto.subtle.importKey('pkcs8', fromBase64(env.LICENCE_PRIVATE_KEY), { name: 'Ed25519' }, false, ['sign']);
  const body = `HD1.${base64url(new TextEncoder().encode(JSON.stringify({ v: 1, ...details, iat: new Date().toISOString() })))}`;
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, key, new TextEncoder().encode(body));
  return `${body}.${base64url(signature)}`;
}

// The licence id is the Paystack customer code, so a key can be renewed
// later without the server storing anything.
function licenceDetails(customer, shop, paidUntil) {
  return {
    id: customer.customer_code,
    shop: shop || '',
    email: customer.email || '',
    plan: 'monthly',
    exp: new Date(paidUntil).toISOString(),
  };
}

// ---------- routes ----------

// Starts a payment: Paystack's page charges ₦5,000 and sets up the monthly plan.
async function pay(request, env) {
  const { email, shop } = await request.json().catch(() => ({}));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) return json(env, { message: 'Enter a valid email address.' }, 400);
  if (!String(shop || '').trim()) return json(env, { message: 'Enter the shop name.' }, 400);
  const self = new URL(request.url).origin;
  const data = await paystack(env, 'POST', '/transaction/initialize', {
    email: String(email).trim(),
    amount: PRICE_KOBO,
    plan: env.PAYSTACK_PLAN_CODE,
    callback_url: `${self}/paid`,
    metadata: { shop: String(shop).trim().slice(0, 100) },
  });
  return json(env, { url: data.authorization_url });
}

// After paying: checks the payment with Paystack and shows the licence key.
async function paid(request, env) {
  const reference = new URL(request.url).searchParams.get('reference');
  if (!reference) return page(env, 'Payment not found', '<p>Open this page from the Paystack payment.</p>', 400);
  let tx;
  try {
    tx = await paystack(env, 'GET', `/transaction/verify/${encodeURIComponent(reference)}`);
  } catch (error) {
    return page(env, 'Payment not found', `<p>${escapeHtml(error.message)}</p>`, 400);
  }
  if (tx.status !== 'success' || tx.amount < PRICE_KOBO) {
    return page(env, 'Payment not completed', '<p>The payment was not completed. You have not been charged; try again from the website.</p>', 402);
  }
  const paidAt = new Date(tx.paid_at || tx.paidAt || Date.now()).getTime();
  const shop = (tx.metadata && tx.metadata.shop) || '';
  const key = await signLicence(env, licenceDetails(tx.customer, shop, paidAt + MONTH_DAYS * DAY));
  return page(env, 'Thank you. Your licence is ready.', `
    <ol>
      <li>${env.DOWNLOAD_URL ? `<a class="btn" href="${escapeHtml(env.DOWNLOAD_URL)}">Download HordeDesk for Windows</a> and install it.` : 'Install HordeDesk.'}</li>
      <li>In HordeDesk, open <strong>Settings</strong>, then <strong>Licence</strong>, paste this key and press <strong>Save licence key</strong>.</li>
    </ol>
    <textarea readonly rows="5" onclick="this.select()">${escapeHtml(key)}</textarea>
    <p><button class="btn" onclick="navigator.clipboard.writeText(document.querySelector('textarea').value);this.textContent='Copied'">Copy the key</button></p>
    <p class="muted">Keep this key. Each month, after the ₦5,000 payment, press <strong>Renew online</strong> in Settings, Licence.
    Licence for ${escapeHtml(shop || tx.customer.email)}, paid until ${new Date(paidAt + MONTH_DAYS * DAY).toDateString()}.</p>`);
}

// Next month's key: asks Paystack whether the customer's subscription is paid.
async function renew(request, env) {
  const { licenceId, shop } = await request.json().catch(() => ({}));
  if (!/^CUS_[a-z0-9]+$/i.test(String(licenceId || ''))) return json(env, { message: 'That is not a licence from the HordeDesk website.' }, 400);
  let customer;
  try {
    customer = await paystack(env, 'GET', `/customer/${encodeURIComponent(licenceId)}`);
  } catch {
    return json(env, { message: 'Licence not found.' }, 404);
  }
  const subs = await paystack(env, 'GET', `/subscription?customer=${customer.id}&perPage=50`);
  const now = Date.now();
  // The paid-up date: the next payment date of an active subscription (or
  // of one cancelled but not yet run out).
  const paidUntil = (subs || [])
    .filter((s) => ['active', 'non-renewing', 'attention'].includes(s.status) && s.next_payment_date)
    .map((s) => new Date(s.next_payment_date).getTime())
    .filter((t) => t > now - 3 * DAY)
    .sort((a, b) => b - a)[0];
  if (!paidUntil) return json(env, { message: 'No payment for this month yet. Pay on the HordeDesk website, then renew again.' }, 402);
  return json(env, { key: await signLicence(env, licenceDetails(customer, String(shop || '').slice(0, 100), paidUntil + DAY)) });
}

function page(env, title, body, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - HordeDesk</title>
<style>
body{margin:0;background:#f2f4f7;color:#111827;font:16px/1.55 'Segoe UI',Arial,sans-serif}
main{max-width:640px;margin:48px auto;padding:28px 32px;background:#fff;border:1px solid #e4e7ec;border-radius:12px}
h1{margin-top:0;font-size:24px}textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cfd4dc;border-radius:8px;font:13px Consolas,monospace;word-break:break-all}
.btn{display:inline-block;padding:10px 16px;border:1px solid #3346d3;border-radius:8px;background:#3346d3;color:#fff;font:inherit;font-weight:650;text-decoration:none;cursor:pointer}
.muted{color:#545e6e;font-size:14px}a{color:#3346d3}li{margin:8px 0}
@media (max-width:640px){main{margin:16px;padding:20px}}
</style></head><body><main><h1>${escapeHtml(title)}</h1>${body}
${env.SITE_URL ? `<p class="muted"><a href="${escapeHtml(env.SITE_URL)}">HordeDesk website</a></p>` : ''}</main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
      if (pathname === '/health') return json(env, { ok: true });
      if (pathname === '/pay' && request.method === 'POST') return await pay(request, env);
      if (pathname === '/paid' && request.method === 'GET') return await paid(request, env);
      if (pathname === '/renew' && request.method === 'POST') return await renew(request, env);
      return json(env, { message: 'Not found.' }, 404);
    } catch (error) {
      return json(env, { message: error.message || 'Something went wrong.' }, 500);
    }
  },
};
