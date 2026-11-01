// Finding products by what a person types: part of the name, or the start
// of a barcode. Used by the till's suggestions, Find product and Add stock.

// Splits a name into lower-case words: "Palmer's Cocoa Butter" -> palmer, s, cocoa, butter.
function wordsOf(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// How well a product matches the typed text (lower is better), or null
// if it does not match at all.
//   0  the name starts with the text          "palm" -> Palm Oil 1L, Palmer's Cocoa Butter
//   1  every typed word starts a word in the name   "cocoa but" -> Palmer's Cocoa Butter
//   2  the text is somewhere inside the name   "ream" -> Nivea Soft Cream 200ml
//   3  the barcode starts with the text
function matchRank(product, query, queryWords) {
  const name = product.name.toLowerCase();
  if (name.startsWith(query)) return 0;
  const nameWords = wordsOf(name);
  if (queryWords.length && queryWords.every((q) => nameWords.some((w) => w.startsWith(q)))) return 1;
  if (name.includes(query)) return 2;
  if ((product.barcode || '').startsWith(query)) return 3;
  return null;
}

// Returns up to "limit" products matching the text, best matches first
// (then in alphabetical order).
export function searchProducts(products, text, limit = 8) {
  const query = text.trim().toLowerCase();
  if (!query) return [];
  const queryWords = wordsOf(query);
  return products
    .map((product) => ({ product, rank: matchRank(product, query, queryWords) }))
    .filter((match) => match.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map((match) => match.product);
}
