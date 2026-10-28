import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';

// Shown after a sale when the receipt printed by itself (Auto-print).
function SaleCompleteModal({ sale, onClose }) {
  return (
    <Modal
      title="Sale completed"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-large" onClick={onClose} autoFocus>
          Next customer <span className="key">Enter</span>
        </button>
      }
    >
      <p className="confirm-total">{formatNaira(sale.total)}</p>
      <dl className="facts">
        <dt>Receipt</dt>
        <dd>{sale.receiptNumber}</dd>
        <dt>Printed</dt>
        <dd>Yes, sent to the printer</dd>
      </dl>
    </Modal>
  );
}

export default SaleCompleteModal;
