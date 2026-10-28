import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';
import { formatDateTime } from '../../utils/dates';

// Lists the bills on hold. "Recall" puts one back on the till.
function RecallModal({ onRecall, onClose }) {
  const [heldBills, setHeldBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the held bills when the dialog opens.
  useEffect(() => {
    async function loadHeldBills() {
      try {
        setHeldBills(await api.get('/held-bills'));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadHeldBills();
  }, []);

  // Throws away a held bill the customer no longer wants.
  async function handleDelete(held) {
    if (!window.confirm(`Delete the held bill "${held.label || 'No name'}"?`)) return;
    try {
      await api.delete(`/held-bills/${held._id}`);
      setHeldBills(heldBills.filter((h) => h._id !== held._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Recall a held bill" onClose={onClose} wide>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading && <p className="loading">Loading held bills...</p>}
      {!loading && !error && heldBills.length === 0 && <p>There are no bills on hold.</p>}
      {heldBills.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Held by</th>
              <th className="num">Items</th>
              <th className="num">Total</th>
              <th><span className="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {heldBills.map((held) => (
              <tr key={held._id}>
                <td>
                  <span className="cell-main">{held.label || 'No name'}</span>
                  <span className="cell-sub">{formatDateTime(held.createdAt)}</span>
                </td>
                <td>{held.heldByName}</td>
                <td className="num">{held.itemCount}</td>
                <td className="num strong">{formatNaira(held.total)}</td>
                <td className="actions">
                  <button type="button" className="btn btn-quiet btn-danger" onClick={() => handleDelete(held)}>Delete</button>
                  <button type="button" className="btn btn-small btn-primary" onClick={() => onRecall(held)}>Recall</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export default RecallModal;
