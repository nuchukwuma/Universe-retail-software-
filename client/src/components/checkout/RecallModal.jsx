import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';
import { formatDateTime } from '../../utils/dates';

// Pop-up listing the bills on hold. Picking one calls onRecall(heldBill).
function RecallModal({ onRecall, onClose }) {
  const [heldBills, setHeldBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the held bills when the box opens.
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
  async function handleDiscard(held) {
    if (!window.confirm(`Delete the held bill "${held.label || 'No name'}"?`)) return;
    try {
      await api.delete(`/held-bills/${held._id}`);
      setHeldBills(heldBills.filter((h) => h._id !== held._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Recall a held bill" onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && heldBills.length === 0 && <p className="muted">There are no bills on hold.</p>}
      <ul className="picker-list held-list">
        {heldBills.map((held) => (
          <li key={held._id}>
            <button type="button" onClick={() => onRecall(held)}>
              <span>
                <strong>{held.label || 'No name'}</strong>
                <br />
                <small className="muted">
                  {held.itemCount} item(s) · held by {held.heldByName} · {formatDateTime(held.createdAt)}
                </small>
              </span>
              <strong>{formatNaira(held.total)}</strong>
            </button>
            <button type="button" className="held-delete" onClick={() => handleDiscard(held)} aria-label="Delete held bill">
              🗑
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default RecallModal;
