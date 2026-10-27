import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';
import { PAYMENT_LABELS } from '../../utils/billMath';

// Shown after a successful sale: receipt number and the change to give.
// (Stage 4 adds the printable receipt preview here.)
function SaleCompleteModal({ sale, onClose }) {
  return (
    <Modal title="Sale complete ✅" onClose={onClose}>
      <div className="sale-complete">
        <p className="muted">Receipt number</p>
        <p className="receipt-number">{sale.receiptNumber}</p>

        <div className="payment-result">
          <div>
            <span>Total</span>
            <strong>{formatNaira(sale.total)}</strong>
          </div>
          <div>
            <span>Paid ({PAYMENT_LABELS[sale.paymentMethod]})</span>
            <strong>{formatNaira(sale.amountTendered)}</strong>
          </div>
        </div>

        {sale.change > 0 && (
          <div className="change-due">
            <span>Give change</span>
            <strong>{formatNaira(sale.change)}</strong>
          </div>
        )}

        {sale.paymentMethod === 'split' && (
          <ul className="split-summary">
            {sale.payments.map((p) => (
              <li key={p.method}>
                {PAYMENT_LABELS[p.method]}: {formatNaira(p.amount)}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn btn-primary btn-block" onClick={onClose} autoFocus>
          New Sale (Enter)
        </button>
      </div>
    </Modal>
  );
}

export default SaleCompleteModal;
