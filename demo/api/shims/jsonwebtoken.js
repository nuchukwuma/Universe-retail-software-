// Demo tokens: the payload in base64, with an expiry. Nothing leaves the
// page, so no signature is needed.
function encode(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

function parseExpiry(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const match = /^(\d+)\s*([smhd])$/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
}

function sign(payload, secret, options = {}) {
  const seconds = parseExpiry(options.expiresIn);
  const body = { ...payload, iat: Math.floor(Date.now() / 1000) };
  if (seconds) body.exp = body.iat + seconds;
  return `demo.${encode(body)}`;
}

function verify(token) {
  if (typeof token !== 'string' || !token.startsWith('demo.')) throw new Error('invalid token');
  const payload = JSON.parse(decodeURIComponent(escape(atob(token.slice(5)))));
  if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('jwt expired');
  return payload;
}

module.exports = { sign, verify };
