import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useKeyTiming, useWindowFocus } from '../../hooks/useScanner';
import useProductSuggestions from '../../hooks/useProductSuggestions';
import ProductSuggestionList from '../ProductSuggestionList';

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
  const [hasFocus, setHasFocus] = useState(false);
  const timing = useKeyTiming();
  const windowFocused = useWindowFocus();
  const list = useProductSuggestions(products, code, { paused });

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
    list.reset();
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
    // After Esc (list closed) nothing is picked: Enter then opens Find
    // product with the text instead.
    const product = source === 'keyboard' ? list.pickFor(typed) : null;
    if (product) {
      pick(product);
      return;
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
    if (list.listOpen && list.suggestions.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      list.move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Escape' && list.listOpen) {
      event.stopPropagation(); // only close the list
      list.dismiss();
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
            onChange={(e) => setCode(e.target.value)}
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
            aria-expanded={list.listOpen}
            aria-controls="scan-suggestions"
            aria-activedescendant={list.listOpen && list.active >= 0 ? `scan-suggestion-${list.active}` : undefined}
            aria-describedby="scan-status"
          />
          {list.listOpen && (
            <ProductSuggestionList
              idPrefix="scan"
              suggestions={list.suggestions}
              active={list.active}
              setActive={list.setActive}
              onPick={pick}
              empty={<p className="scan-suggestions-empty">No product matches "{list.query}". Press Enter to search all products.</p>}
            />
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
