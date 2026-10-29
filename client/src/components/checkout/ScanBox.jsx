import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useKeyTiming, useWindowFocus } from '../../hooks/useScanner';

// Returns true if the user is busy in another text box (quantity,
// search...), in which case we must not steal the keyboard from them.
function isTypingInAnotherBox(scanInput) {
  const active = document.activeElement;
  if (!active || active === scanInput || active === document.body) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable;
}

// The till's barcode box. It keeps the keyboard focus so a scan works
// at any moment: after every sale, when a dialog closes, and after a
// click anywhere that is not another text box.
// On Enter it calls onSubmit(code, source) where source is 'scanner'
// (the code arrived in a few milliseconds) or 'keyboard' (a person typed it).
// "paused" is true while a dialog is open.
const ScanBox = forwardRef(function ScanBox({ onSubmit, paused, children }, ref) {
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [hasFocus, setHasFocus] = useState(false);
  const timing = useKeyTiming();
  const windowFocused = useWindowFocus();

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

  // Enter = look the code up. The box is emptied straight away, ready
  // for the next scan.
  function handleKeyDown(event) {
    if (event.key !== 'Enter') {
      timing.record(event);
      return;
    }
    event.preventDefault();
    const scanned = code.trim();
    const source = timing.wasScanner() ? 'scanner' : 'keyboard';
    timing.reset();
    setCode('');
    if (scanned) onSubmit(scanned, source);
  }

  let status = { text: 'Scanner ready', className: 'scanner-status-ready' };
  if (!windowFocused) status = { text: 'Scanner paused: click inside this window', className: 'scanner-status-paused' };
  else if (paused) status = { text: 'Scanner paused while a window is open', className: 'scanner-status-paused' };
  else if (!hasFocus) status = { text: 'Scanner paused: click the barcode box or press Esc', className: 'scanner-status-paused' };

  return (
    <div className="scan">
      <label htmlFor="scan-input" className="scan-label">Scan or type a barcode</label>
      <div className="scan-row">
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
          aria-describedby="scan-status"
        />
        <button
          type="button"
          className="btn"
          onClick={() => {
            const typed = code.trim();
            setCode('');
            timing.reset();
            if (typed) onSubmit(typed, 'keyboard');
          }}
        >
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
