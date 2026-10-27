import { useCallback, useEffect, useRef, useState } from 'react';

// Returns true if the user is typing in a real box (search, quantity...),
// in which case we must not steal the keyboard from them.
function isTypingInAnotherBox(hiddenInput) {
  const active = document.activeElement;
  if (!active || active === hiddenInput || active === document.body) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable;
}

// An invisible text box that stays focused on the checkout screen.
// A USB barcode scanner acts like a keyboard: it "types" the code and
// presses Enter. When Enter arrives we call onScan(code).
// "paused" switches it off while a pop-up box is open.
function ScannerInput({ onScan, paused }) {
  const inputRef = useRef(null);
  const [code, setCode] = useState('');

  // Puts the keyboard focus back on the hidden box, unless the user is
  // typing somewhere else or a pop-up box is open.
  const refocus = useCallback(() => {
    const input = inputRef.current;
    if (!paused && input && !isTypingInAnotherBox(input)) {
      input.focus({ preventScroll: true });
    }
  }, [paused]);

  // Focus now, and again after every click (e.g. on a product or button).
  useEffect(() => {
    refocus();
    const handleClick = () => setTimeout(refocus, 0);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [refocus]);

  // When Enter is pressed, send the code and empty the box.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const scanned = code.trim();
      setCode('');
      if (scanned) onScan(scanned);
    }
  }

  return (
    <input
      ref={inputRef}
      className="scanner-input"
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => setTimeout(refocus, 0)}
      inputMode="none" // stops the phone keyboard popping up
      autoComplete="off"
      aria-label="Barcode scanner input"
      tabIndex={-1}
    />
  );
}

export default ScannerInput;
