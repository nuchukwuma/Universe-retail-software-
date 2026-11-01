import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useKeyTiming, useWindowFocus } from '../../hooks/useScanner';
import { searchProducts } from '../../utils/productSearch';
import { formatNaira } from '../../utils/formatNaira';

// Suggestions appear once typing pauses for this long. A scanner types the
// whole code (and Enter) much faster, so scans never flash a list.
const SUGGEST_DELAY_MS = 150;
const MAX_SUGGESTIONS = 8;

// True if the text has a letter in it (a name, not a barcode).
function hasLetter(text) {
  return /[a-z]/i.test(text);
}

// Returns true if the user is busy in another text box (quantity,
// search...), in which case we must not steal the keyboard from them.
function isTypingInAnotherBox(scanInput) {
  const active = document.activeElement;
  if (!active || active === scanInput || active === document.body) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable;
}

// The till's "scan or type" box. It keeps the keyboard focus so a scan
// works at any moment: after every sale, when a dialog closes, and after
// a click anywhere that is not another text box.
// - Typing a name lists matching products under the box ("palm" -> Palm
//   Oil, Palmer's...). Up and Down choose, Enter or a click adds it:
//   onPick(product).
// - Otherwise Enter calls onSubmit(code, source), where source is
//   'scanner' (the code arrived in a few milliseconds) or 'keyboard'.
// "paused" is true while a dialog is open.
const ScanBox = forwardRef(function ScanBox({ products, onSubmit, onPick, paused, children }, ref) {
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [query, setQuery] = useState(''); // the text the suggestions are for
  const [active, setActive] = useState(-1); // highlighted suggestion, -1 = none
  const [dismissed, setDismissed] = useState(false); // Esc hides the list
  const [hasFocus, setHasFocus] = useState(false);
  const timing = useKeyTiming();
  const windowFocused = useWindowFocus();

  const suggestions = useMemo(() => searchProducts(products, query, MAX_SUGGESTIONS), [products, query]);
  const listOpen = !paused && !dismissed && query !== '' && query === code.trim();

  // Update the suggestions once typing pauses. For a name, the best match
  // is highlighted so Enter adds it; for digits nothing is, so Enter still
  // looks the barcode up.
  useEffect(() => {
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

  // Puts the keyboard focus back on the scan box when it is safe to.
  const refocus = useCallback(() => {
    const input = inputRef.current;
    if (!paused && input && !isTypingInAnotherBox(input)) {
      input.focus({ preventScroll: true });
    }
  }, [paused]);

  // The page can always pull the focus back (e.g. when Esc is pressed).
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus({ preventScroll: true }) }), []);

  // Focus now (and every time a dialog closes), and after every click.
  useEffect(() => {
    refocus();
    const handleClick = () => setTimeout(refocus, 0);
    document.addEventListener('click', handleClick);
    window.addEventListener('focus', refocus);
    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('focus', refocus);
    };
  }, [refocus]);

  // Empties the box, ready for the next scan.
  function clear() {
    setCode('');
    setQuery('');
    setActive(-1);
    timing.reset();
  }

  // Adds a suggested product to the bill.
  function pick(product) {
    clear();
    onPick(product);
  }

  // Enter or the Add button: add the highlighted suggestion, or look the
  // code up. A scan always counts as a barcode, whatever is listed.
  function submit(source) {
    const typed = code.trim();
    if (!typed) return;
    if (source === 'keyboard') {
      // If typing was faster than the list, use the best match for what is
      // typed now. After Esc (list closed) nothing is picked: Enter then
      // opens Find product with the text instead.
      const upToDate = query === typed;
      const list = upToDate ? suggestions : searchProducts(products, typed, MAX_SUGGESTIONS);
      let index = -1;
      if (!dismissed) index = upToDate ? active : hasLetter(typed) ? 0 : -1;
      if (index >= 0 && list[index]) {
        pick(list[index]);
        return;
      }
    }
    clear();
    onSubmit(typed, source);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit(timing.wasScanner() ? 'scanner' : 'keyboard');
      return;
    }
    if (listOpen && suggestions.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === 'Escape' && listOpen) {
      event.stopPropagation(); // only close the list
      setDismissed(true);
      return;
    }
    timing.record(event);
  }

  let status = { text: 'Scanner ready', className: 'scanner-status-ready' };
  if (!windowFocused) status = { text: 'Scanner paused: click inside this window', className: 'scanner-status-paused' };
  else if (paused) status = { text: 'Scanner paused while a window is open', className: 'scanner-status-paused' };
  else if (!hasFocus) status = { text: 'Scanner paused: click the barcode box or press Esc', className: 'scanner-status-paused' };

  return (
    <div className="scan">
      <label htmlFor="scan-input" className="scan-label">Scan a barcode or type a product name</label>
      <div className="scan-row">
        <div className="scan-field">
          <input
            id="scan-input"
            ref={inputRef}
            className="scan-input"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setDismissed(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setHasFocus(true)}
            onBlur={() => {
              setHasFocus(false);
              setTimeout(refocus, 0);
            }}
            autoComplete="off"
            spellCheck={false}
            data-scan-input
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls="scan-suggestions"
            aria-activedescendant={listOpen && active >= 0 ? `scan-suggestion-${active}` : undefined}
            aria-describedby="scan-status"
          />
          {listOpen && (
            <div className="scan-suggestions">
              {suggestions.length === 0 ? (
                <p className="scan-suggestions-empty">No product matches "{query}". Press Enter to search all products.</p>
              ) : (
                <>
                  <ul id="scan-suggestions" role="listbox" aria-label="Matching products">
                    {suggestions.map((product, index) => (
                      <li
                        key={product._id}
                        id={`scan-suggestion-${index}`}
                        role="option"
                        aria-selected={index === active}
                        className={index === active ? 'is-active' : undefined}
                        // Keep the cursor in the box; the click adds the product.
                        onMouseDown={(e) => e.preventDefault()}
                        // Only a real mouse move highlights: a list that appears under a
                        // resting pointer must not change what Enter adds.
                        onMouseMove={() => index !== active && setActive(index)}
                        onClick={() => pick(product)}
                      >
                        <span className="scan-suggestion-name">
                          {product.name}
                          <span className="scan-suggestion-sub">{product.category?.name || 'No category'}</span>
                        </span>
                        <span className="num strong">{formatNaira(product.sellingPrice)}</span>
                        <span className={product.quantity > 0 ? 'num muted' : 'num danger-text'}>
                          {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="scan-suggestions-hint">Up and Down keys to choose, Enter or click to add.</p>
                </>
              )}
            </div>
          )}
        </div>
        <button type="button" className="btn" onClick={() => submit('keyboard')}>
          Add
        </button>
      </div>
      <div className="scan-feedback">
        <p id="scan-status" className={`scanner-status ${status.className}`} role="status">{status.text}</p>
        {children}
      </div>
    </div>
  );
});

export default ScanBox;
