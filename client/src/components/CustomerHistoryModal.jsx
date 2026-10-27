import { useEffect, useState } from 'react';
import { api } from '../api/api';
import Modal from './Modal';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime } from '../utils/dates';
import { PAYMENT_LABELS } from '../utils/billMath';

// Pop-up showing everything a customer has bought, newest first.
function CustomerHistoryModal({ customer, onClose }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the customer's sales when the box opens.
  useEffect(() => {
    async function loadSales() {
      try {
        setSales(await api.get(`/customers/${customer._id}/sales`));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSales();
  }, [customer._id]);

  const totalSpent = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <Modal title={`${customer.name} - purchase history`} onClose={onClose} wide>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <>
          <p>
            <strong>{sales.length}</strong> purchase(s), total spent <strong>{formatNaira(totalSpent)}</strong>
          </p>
          {sales.length === 0 && <p className="muted">No purchases yet.</p>}
          <ul className="history-list">
            {sales.map((sale) => (
              <li key={sale._id}>
                <div className="history-list-top">
                  <span>
                    <strong>{sale.receiptNumber}</strong>
                    <span className="muted"> · {formatDateTime(sale.createdAt)}</span>
                  </span>
                  <strong>{formatNaira(sale.total)}</strong>
                </div>
                <div className="muted small">
                  {sale.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
                </div>
                <div className="muted small">
                  {PAYMENT_LABELS[sale.paymentMethod]} · served by {sale.cashierName}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

export default CustomerHistoryModal;
