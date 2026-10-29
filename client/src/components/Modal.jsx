import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A dialog shown on top of the page.
// - Esc or the "Close" button closes it.
// - The keyboard stays inside the dialog while it is open (Tab cycles round).
// - "footer" holds the dialog's buttons; "wide" makes it wider.
function Modal({ title, onClose, children, footer, wide = false }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Put the keyboard focus inside the dialog when it opens (the first
  // box marked autoFocus wins, otherwise the first thing you can press).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.contains(document.activeElement)) {
      const first = dialog.querySelector('[autofocus]') || dialog.querySelector('.dialog-body ' + FOCUSABLE) || dialog.querySelector(FOCUSABLE);
      first?.focus();
    }
  }, []);

  // Esc closes; Tab and Shift+Tab stay inside the dialog.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={wide ? 'dialog dialog-wide' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Close <span className="key">Esc</span>
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
