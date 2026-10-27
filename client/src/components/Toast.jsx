import { useCallback, useEffect, useRef, useState } from 'react';

// A short message that pops up at the top of the screen and fades away.
// Usage: const { toast, showToast } = useToast();  showToast('Saved!', 'success');
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  // Shows a message for 2.5 seconds. type: 'success', 'error' or 'info'.
  const showToast = useCallback((message, type = 'info') => {
    clearTimeout(timerRef.current);
    setToast({ message, type, id: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Stop the timer if the page closes.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toast, showToast };
}

// Draws the message from useToast (draws nothing when there is none).
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
      {toast.message}
    </div>
  );
}

export default Toast;
