import { useEffect, useRef, useState } from 'react';

// USB and Bluetooth barcode scanners work like a very fast keyboard:
// they "type" the whole code within a few milliseconds, then press Enter.
// People type much slower (usually 80 ms or more between keys).
// So: several characters, each within SCANNER_MAX_KEY_GAP_MS of the last,
// followed by Enter = a scan.
export const SCANNER_MAX_KEY_GAP_MS = 40;
export const SCANNER_MIN_LENGTH = 4;

// Returns true if a list of key-press times (in ms) came from a scanner.
export function looksLikeScanner(times) {
  if (times.length < SCANNER_MIN_LENGTH) return false;
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] - times[i - 1] > SCANNER_MAX_KEY_GAP_MS) return false;
  }
  return true;
}

// Puts a text box back to what it held before a scan was typed into it by
// accident (e.g. the cursor was in the "Name" box when a scan came in).
// Works wherever the cursor was in the box.
function restoreValue(element, valueBefore) {
  if (!element || typeof element.value !== 'string' || element.value === valueBefore) return;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
  if (!setter) return;
  setter.call(element, valueBefore);
  element.dispatchEvent(new Event('input', { bubbles: true })); // tell React
}

// Listens for barcode scans anywhere on the page and calls onScan(code).
// Normal typing is left alone. If a scan lands in a text box, the box is
// put back as it was, so the scan never spoils a form.
// The till's own scan box (marked data-scan-input) handles its own scans.
export function useGlobalScanner(onScan, enabled = true) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return undefined;
    let buffer = '';
    let times = [];
    let target = null; // the box the fast keys went into
    let valueBefore = ''; // what that box held before them

    function handleKeyDown(event) {
      if (event.target?.closest?.('[data-scan-input]')) return;
      if (event.ctrlKey || event.altKey || event.metaKey) {
        buffer = '';
        times = [];
        return;
      }

      const now = event.timeStamp;
      if (event.key === 'Enter') {
        const lastGap = times.length ? now - times[times.length - 1] : Infinity;
        if (looksLikeScanner(times) && lastGap <= SCANNER_MAX_KEY_GAP_MS * 2) {
          event.preventDefault(); // do not submit a form or press a button
          event.stopPropagation();
          restoreValue(target, valueBefore);
          onScanRef.current(buffer.trim());
        }
        buffer = '';
        times = [];
        return;
      }

      if (event.key.length !== 1) return; // Shift, Tab, arrows...
      if (event.key === ' ') {
        buffer = ''; // barcodes never contain spaces: this is a person typing
        times = [];
        return;
      }
      if (times.length && now - times[times.length - 1] > SCANNER_MAX_KEY_GAP_MS) {
        buffer = ''; // too slow: a person is typing, start again
        times = [];
      }
      if (!buffer) {
        // First key of what may be a scan: remember the box as it is now
        // (this runs before the key reaches the box).
        target = event.target;
        valueBefore = typeof target?.value === 'string' ? target.value : '';
      }
      buffer += event.key;
      times.push(now);
    }

    // "true" = see the keys before any text box or button does.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}

// Remembers when each key was typed into one text box, so that when
// Enter is pressed we can tell a scan from a person typing.
// Usage: const timing = useKeyTiming();  <input onKeyDown={timing.record} />
//        on Enter: timing.wasScanner() -> true/false, then timing.reset()
export function useKeyTiming() {
  const timesRef = useRef([]);
  return {
    record(event) {
      if (event.key.length === 1) timesRef.current.push(event.timeStamp);
    },
    wasScanner() {
      return looksLikeScanner(timesRef.current);
    },
    reset() {
      timesRef.current = [];
    },
  };
}

// True while this app window has the keyboard (scans can reach it).
// When the user switches to another program, scans cannot arrive.
export function useWindowFocus() {
  const [focused, setFocused] = useState(() => document.hasFocus());
  useEffect(() => {
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    window.addEventListener('focus', on);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('focus', on);
      window.removeEventListener('blur', off);
    };
  }, []);
  return focused;
}
