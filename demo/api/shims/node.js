// Small stand-ins for the Node modules the server touches (crypto, path,
// os). Each is exported under its own name; build.mjs maps them.

// crypto.randomBytes for record ids, from the browser's random numbers.
function randomBytes(size) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return {
    toString: () => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''),
    readUIntBE: (offset, length) => Array.from(bytes.slice(offset, offset + length)).reduce((n, b) => n * 256 + b, 0),
  };
}

function join(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

const path = {
  join,
  resolve: (...parts) => join(...parts),
  basename: (p) => String(p).split('/').pop(),
  dirname: (p) => String(p).split('/').slice(0, -1).join('/') || '/',
  extname: (p) => {
    const m = /\.[^./]*$/.exec(String(p));
    return m ? m[0] : '';
  },
  sep: '/',
};

const os = { uptime: () => 0, homedir: () => '/demo', tmpdir: () => '/tmp' };

// Anything else (files, network): never reached in the demo.
const unavailable = new Proxy(
  {},
  {
    get: (_, name) => (name === '__esModule' ? false : () => {
      throw new Error('Not available in the demo.');
    }),
  },
);

module.exports = { crypto: { randomBytes }, path, os, unavailable };
