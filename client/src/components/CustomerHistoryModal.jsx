import { useEffect, useState } from 'react';
import { api } from '../api/api';
import Modal from './Modal';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime } from '../utils/dates';

// Everything a customer has bought, newest first.
function CustomerHistoryModal({ customer, onClose }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the customer's sales when the dialog opens.
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
    <Modal title={`${customer.name}: purchases`} onClose={onClose} wide>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading && <p className="loading">Loading purchases...</p>}
      {!loading && !error && (
        <>
          <p>{sales.length} purchase{sales.length === 1 ? '' : 's'}, {formatNaira(totalSpent)} in total.</p>
          {sales.length === 0 ? (
            <p className="muted">No purchases yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Items</th>
                  <th>Served by</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale._id}>
                    <td>
                      <span className="cell-main">{sale.receiptNumber}</span>
                      <span className="cell-sub">{formatDateTime(sale.createdAt)}</span>
                    </td>
                    <td>{sale.items.map((item) => `${item.name} (${item.quantity})`).join(', ')}</td>
                    <td>{sale.cashierName}</td>
                    <td className="num strong">{formatNaira(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Modal>
  );
}

export default CustomerHistoryModal;
