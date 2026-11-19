// Makes a HordeDesk licence key by hand, signed with the private key.
//   node licence-server/scripts/make-licence.mjs --shop "Shop name" --lifetime
//   node licence-server/scripts/make-licence.mjs --shop "Shop name" --email a@b.ng --days 31
// The private key is read from licence-server/keys/private-key.txt (never
// committed) or the LICENCE_PRIVATE_KEY environment variable.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const keyText = process.env.LICENCE_PRIVATE_KEY || fs.readFileSync(path.join(here, '..', 'keys', 'private-key.txt'), 'utf8');
const privateKey = crypto.createPrivateKey({ key: Buffer.from(keyText.trim(), 'base64'), format: 'der', type: 'pkcs8' });
const shop = arg('shop');
if (!shop) {
  console.error('Usage: --shop "Shop name" (--lifetime | --days 31) [--email someone@example.com]');
  process.exit(1);
}
const lifetime = args.includes('--lifetime');
const days = Number(arg('days') || 31);
const details = {
  v: 1,
  id: arg('id') || `lic_${crypto.randomBytes(8).toString('hex')}`,
  shop,
  email: arg('email') || '',
  plan: lifetime ? 'lifetime' : 'monthly',
  exp: lifetime ? null : new Date(Date.now() + days * 86400000).toISOString(),
  iat: new Date().toISOString(),
};
const body = `HD1.${Buffer.from(JSON.stringify(details)).toString('base64url')}`;
const signature = crypto.sign(null, Buffer.from(body), privateKey).toString('base64url');
console.log(`${body}.${signature}`);
