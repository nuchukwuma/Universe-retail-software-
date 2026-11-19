// HordeDesk licences: ₦5,000 a month after a 14-day free trial.
//
// A licence key is signed by the HordeDesk licence server (see
// /licence-server) with its private key; the app checks it with the public
// key below, so no internet is needed to use the app day to day.
//   HD1.<details>.<signature>     details = base64url JSON:
//   { v: 1, id, shop, email, plan: 'monthly' | 'lifetime', exp: ISO date | null, iat }
//
// Without a valid licence, once the trial is over, selling and changing
// stock stop (402 LICENCE_REQUIRED); reports, backups, settings and
// entering a licence key keep working.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getSettings } = require('./settings');
const { postJson } = require('./postJson');

// The licence server's public key (its private key signs the licences).
const PUBLIC_KEY_DER = 'MCowBQYDK2VwAyEA+JpQSN3JXzXFWYDa70+jPb7Du51PsaAa7EeDD3DY/PA=';
let publicKey = null;
function licencePublicKey() {
  if (!publicKey) publicKey = crypto.createPublicKey({ key: Buffer.from(PUBLIC_KEY_DER, 'base64'), format: 'der', type: 'spki' });
  return publicKey;
}
const TRIAL_DAYS = 14;
const GRACE_DAYS = 3; // a paid month still works this long after it ends (time to renew)
const DAY = 24 * 60 * 60 * 1000;

// Where to pay and renew online (filled in when the installer is built).
function licenceConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'licence.json'), 'utf8'));
  } catch {
    return {};
  }
}

function fromBase64Url(text) {
  return Buffer.from(String(text).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// Checks a licence key. Answers its details, or throws a message to show.
function readLicenceKey(key) {
  const parts = String(key || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'HD1') throw new Error('That is not a HordeDesk licence key. Copy the whole key again.');
  const ok = crypto.verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), licencePublicKey(), fromBase64Url(parts[2]));
  if (!ok) throw new Error('That licence key is not valid. Copy the whole key again.');
  const details = JSON.parse(fromBase64Url(parts[1]).toString('utf8'));
  if (details.v !== 1 || !details.id) throw new Error('That licence key is not valid.');
  return details;
}

// "Now" for licences: never earlier than a time the app has already seen,
// so setting the computer's clock back does not bring a licence back.
async function licenceNow(settings) {
  const now = Date.now();
  const seen = settings.licenceSeenAt ? new Date(settings.licenceSeenAt).getTime() : 0;
  if (now > seen + 60 * 60 * 1000) {
    settings.licenceSeenAt = new Date(now);
    await settings.save();
  }
  return Math.max(now, seen);
}

// The shop's licence state:
//   { state: 'licensed' | 'trial' | 'expired', plan, shop, email, paidUntil,
//     renewSoon, trialEndsAt, daysLeft, payUrl, canRenewOnline }
async function licenceStatus() {
  const config = licenceConfig();
  const base = { payUrl: config.payUrl || '', canRenewOnline: Boolean(config.serverUrl) };
  if (process.env.HORDEDESK_DEMO === '1') return { ...base, state: 'licensed', plan: 'demo' };

  const settings = await getSettings();
  if (!settings.trialStartedAt) {
    settings.trialStartedAt = new Date();
    await settings.save();
  }
  const now = await licenceNow(settings);

  if (settings.licenceKey) {
    try {
      const licence = readLicenceKey(settings.licenceKey);
      const paidUntil = licence.exp ? new Date(licence.exp).getTime() : null;
      const info = { ...base, plan: licence.plan, shop: licence.shop || '', email: licence.email || '', licenceId: licence.id, paidUntil: paidUntil ? new Date(paidUntil).toISOString() : null };
      if (paidUntil === null) return { ...info, state: 'licensed' };
      if (now <= paidUntil + GRACE_DAYS * DAY) {
        return { ...info, state: 'licensed', renewSoon: now > paidUntil - 3 * DAY, daysLeft: Math.max(0, Math.ceil((paidUntil - now) / DAY)) };
      }
      return { ...info, state: 'expired' };
    } catch {
      // a damaged key counts as no key
    }
  }

  const trialEnds = new Date(settings.trialStartedAt).getTime() + TRIAL_DAYS * DAY;
  if (now < trialEnds) {
    return { ...base, state: 'trial', trialEndsAt: new Date(trialEnds).toISOString(), daysLeft: Math.ceil((trialEnds - now) / DAY) };
  }
  return { ...base, state: 'expired', trialEndsAt: new Date(trialEnds).toISOString() };
}

// Saves a licence key the owner typed in. Answers the new status.
async function saveLicenceKey(key) {
  readLicenceKey(key); // throws a message if it is not valid
  const settings = await getSettings();
  settings.licenceKey = String(key).trim();
  await settings.save();
  return licenceStatus();
}

// Asks the licence server for this month's key (after the monthly payment).
async function renewOnline() {
  const { serverUrl } = licenceConfig();
  if (!serverUrl) throw new Error('Online renewal is not set up. Enter the licence key from your payment email instead.');
  const settings = await getSettings();
  if (!settings.licenceKey) throw new Error('Enter your licence key first.');
  const licence = readLicenceKey(settings.licenceKey);
  let reply;
  try {
    reply = (await postJson(`${serverUrl.replace(/\/$/, '')}/renew`, { licenceId: licence.id })).data;
  } catch (error) {
    throw new Error(`Could not reach the licence server. Check the internet connection. (${error.message})`);
  }
  if (!reply || !reply.key) throw new Error((reply && reply.message) || 'No new licence yet. Has this month been paid?');
  return saveLicenceKey(reply.key);
}

// Middleware: refuses selling and stock changes without a licence.
async function requireLicence(req, res, next) {
  try {
    const status = await licenceStatus();
    if (status.state === 'expired') {
      return res.status(402).json({
        code: 'LICENCE_REQUIRED',
        message: status.trialEndsAt && !status.plan
          ? 'The free trial has ended. Enter a licence key in Settings to carry on selling.'
          : 'The HordeDesk licence has run out. Renew it in Settings to carry on selling.',
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { readLicenceKey, licenceStatus, saveLicenceKey, renewOnline, requireLicence, TRIAL_DAYS };
