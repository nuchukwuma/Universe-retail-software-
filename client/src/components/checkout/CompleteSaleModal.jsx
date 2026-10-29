import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';

// Last check before the sale is saved: the total, how many items and who
// the customer is. Enter completes the sale; Esc goes back to the bill.
function CompleteSaleModal({ bill, totals, saving, error, onConfirm, onClose }) {
  return (
    <Modal
      title="Complete this sale?"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn push-left" onClick={onClose}>Back to the bill</button>
          <button type="button" className="btn btn-primary btn-large" onClick={onConfirm} disabled={saving} autoFocus>
            {saving ? 'Saving the sale...' : 'Complete sale'} <span className="key">Enter</span>
          </button>
        </>
      }
    >
      <p className="confirm-total">{formatNaira(totals.total)}</p>
      <dl className="facts">
        <dt>Items</dt>
        <dd>{totals.quantityCount} on {totals.lineCount} line{totals.lineCount === 1 ? '' : 's'}</dd>
        {totals.discountTotal > 0 && (
          <>
            <dt>Discount</dt>
            <dd>{formatNaira(totals.discountTotal)}</dd>
          </>
        )}
        <dt>Customer</dt>
        <dd>{bill.customerName || 'Walk-in customer'}</dd>
      </dl>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
    </Modal>
  );
}

export default CompleteSaleModal;
