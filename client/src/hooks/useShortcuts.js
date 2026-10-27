import { useEffect, useRef } from 'react';

// Runs a function when a keyboard key is pressed anywhere on the page.
// "shortcuts" looks like { F1: openHelp, F10: openPayment }.
// Set "enabled" to false to switch the shortcuts off (e.g. while a box is open).
export function useShortcuts(shortcuts, enabled = true) {
  // Keep the latest functions without re-adding the listener each render.
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return undefined;

    function handleKeyDown(event) {
      const action = shortcutsRef.current[event.key];
      if (action) {
        event.preventDefault(); // stop the browser's own F-key action (F1 = browser help)
        action();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
