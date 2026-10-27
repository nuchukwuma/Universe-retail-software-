import { useState } from 'react';
import Modal from '../Modal';

// Pop-up asking for a short name for the bill being put on hold,
// so it is easy to find again (e.g. "Lady in red", "Mr Emeka").
function HoldBillModal({ defaultLabel, saving, error, onHold, onClose }) {
  const [label, setLabel] = useState(defaultLabel);

  // Runs when "Hold Bill" is pressed.
  function handleSubmit(event) {
    event.preventDefault();
    onHold(label.trim());
  }

  return (
    <Modal title="Hold this bill" onClose={onClose}>
      <form className="customer-form" onSubmit={handleSubmit}>
        <label>
          Name for this bill
          <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="e.g. Customer in blue shirt" />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Holding...' : '⏸️ Hold Bill'}
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default HoldBillModal;
