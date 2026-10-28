import { useId, useState } from 'react';
import Modal from '../Modal';

// Asks for a short name for the bill being put on hold, so it is easy
// to find again (e.g. "Lady in red", "Mr Emeka").
function HoldBillModal({ defaultLabel, saving, error, onHold, onClose }) {
  const formId = useId();
  const [label, setLabel] = useState(defaultLabel);

  // Runs when "Hold bill" is pressed.
  function handleSubmit(event) {
    event.preventDefault();
    onHold(label.trim());
  }

  return (
    <Modal
      title="Hold this bill"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>
            {saving ? 'Holding...' : 'Hold bill'}
          </button>
        </>
      }
    >
      <form id={formId} className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-label`}>Name for this bill</label>
          <input id={`${formId}-label`} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="e.g. Customer in blue shirt" />
          <span className="field-help">The till empties for the next customer. Use Recall bill (F7) to bring it back.</span>
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}

export default HoldBillModal;
