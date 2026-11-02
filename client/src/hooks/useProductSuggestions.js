import { useEffect, useMemo, useState } from 'react';
import { searchProducts } from '../utils/productSearch';

// Suggestions appear once typing pauses for this long. A scanner types the
// whole code (and Enter) much faster, so scans never flash a list.
const SUGGEST_DELAY_MS = 150;
const MAX_SUGGESTIONS = 8;

// True if the text has a letter in it (a name, not a barcode).
export function hasLetter(text) {
  return /[a-z]/i.test(text);
}

// The list of matching products shown under a "scan or type" box (the till
// and Add stock). "code" is what is in the box now.
// - For a name, the best match is highlighted so Enter adds it; for digits
//   nothing is, so Enter still looks the barcode up.
// - Up and Down move the highlight (move), Esc hides the list (dismiss).
function useProductSuggestions(products, code, { paused = false } = {}) {
  const [query, setQuery] = useState(''); // the text the suggestions are for
  const [active, setActive] = useState(-1); // highlighted suggestion, -1 = none
  const [dismissed, setDismissed] = useState(false); // Esc hides the list

  const suggestions = useMemo(() => searchProducts(products, query, MAX_SUGGESTIONS), [products, query]);
  const listOpen = !paused && !dismissed && query !== '' && query === code.trim();

  // Update the suggestions once typing pauses; typing again shows the list again.
  useEffect(() => {
    setDismissed(false);
    const text = code.trim();
    if (!text) {
      setQuery('');
      return undefined;
    }
    const timer = setTimeout(() => {
      setQuery(text);
      setActive(hasLetter(text) ? 0 : -1);
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code]);

  // The product Enter should add for the typed text, or null (then the
  // text is treated as a barcode). If typing was faster than the list, the
  // best match for what is typed now is used. After Esc nothing is picked.
  function pickFor(typed) {
    if (dismissed) return null;
    if (query === typed) return active >= 0 ? suggestions[active] || null : null;
    return hasLetter(typed) ? searchProducts(products, typed, 1)[0] || null : null;
  }

  // Moves the highlight one step down (1) or up (-1), round the list.
  function move(step) {
    if (suggestions.length) setActive((current) => (current + step + suggestions.length) % suggestions.length);
  }

  // Forgets the list (after a pick, or when the box is emptied).
  function reset() {
    setQuery('');
    setActive(-1);
  }

  return { query, suggestions, active, setActive, listOpen, dismiss: () => setDismissed(true), pickFor, move, reset };
}

export default useProductSuggestions;
