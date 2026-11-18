// Demo passwords: a quick, non-secret hash (the demo holds no real secrets).
function quickHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `demo$${(h >>> 0).toString(16)}$${text.length}`;
}

module.exports = {
  hash: async (text) => quickHash(String(text)),
  compare: async (text, hash) => quickHash(String(text)) === hash,
};
