import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '../../api/api';
import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';
import { pointsDiscount } from '../../utils/loyalty';

// The bill's loyalty customer: find them by name or phone (or add a new
// one), and choose how many of their points to spend on this bill.
function CustomerModal({ bill, settings, billTotal, onChoose, onSetPoints, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [points, setPoints] = useState(bill.pointsToUse ? String(bill.pointsToUse) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const customer = bill.customer;

  // Search as the cashier types (a short pause first).
  useEffect(() => {
    if (customer || adding) return undefined;
    const timer = setTimeout(async () => {
      try {
        setResults(await api.get(`/customers?search=${encodeURIComponent(search.trim())}`));
      } catch (err) {
        setError(err.message);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [search, customer, adding]);

  async function addCustomer(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onChoose(await api.post('/customers', form));
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const most = customer ? pointsDiscount(settings, customer.points, billTotal).points : 0;
  const spend = customer ? pointsDiscount(settings, Math.min(Number(points) || 0, customer.points), billTotal) : { points: 0, amount: 0 };

  function applyPoints(event) {
    event.preventDefault();
    onSetPoints(spend.points);
    onClose();
  }

  if (customer) {
    return (
      <Modal
        title={customer.name}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn-quiet btn-danger push-left" onClick={() => onChoose(null)}>Remove customer</button>
            <button type="button" className="btn" onClick={onClose}>Done</button>
            <button type="submit" form="points-form" className="btn btn-primary" disabled={spend.points === 0 && !bill.pointsToUse}>
              {spend.points > 0 ? `Use ${spend.points} points` : 'Use no points'}
            </button>
          </>
        }
      >
        <dl className="facts">
          <dt>Phone</dt>
          <dd>{customer.phone}</dd>
          <dt>Points</dt>
          <dd className="strong">{customer.points.toLocaleString('en-NG')} (worth {formatNaira(customer.points * (Number(settings.loyaltyPointValue) || 0))})</dd>
        </dl>
        <form id="points-form" className="stack" onSubmit={applyPoints}>
          <div className="field">
            <label className="field-label" htmlFor="points-use">Points to use on this bill</label>
            <div className="btn-row">
              <input id="points-use" className="input-number" type="number" min="0" max={most} step="1" value={points} onChange={(e) => setPoints(e.target.value)} autoFocus placeholder="0" />
              <button type="button" className="btn btn-small" onClick={() => setPoints(String(most))} disabled={most === 0}>All ({most})</button>
            </div>
            {spend.points > 0 && <span className="field-help">{formatNaira(spend.amount)} off</span>}
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title={adding ? 'New customer' : 'Customer'} onClose={onClose}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {adding ? (
        <form className="stack" onSubmit={addCustomer}>
          <div className="field">
            <label className="field-label" htmlFor="new-customer-name">Name</label>
            <input id="new-customer-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="new-customer-phone">Phone</label>
            <input id="new-customer-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setAdding(false)}>Back</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Add customer'}</button>
          </div>
        </form>
      ) : (
        <div className="stack">
          <div className="field">
            <label className="field-label" htmlFor="customer-search">Name or phone</label>
            <input id="customer-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus autoComplete="off" />
          </div>
          <ul className="pick-list" aria-label="Customers">
            {results.map((c) => (
              <li key={c._id}>
                <button type="button" onClick={() => onChoose(c)}>
                  <span>
                    <span className="strong">{c.name}</span>
                    <span className="muted small"> {c.phone}</span>
                  </span>
                  <span className="num">{c.points.toLocaleString('en-NG')} pts</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="muted pick-list-empty">No customers found</li>}
          </ul>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const digits = search.replace(/[^\d+]/g, '');
                setForm({ name: digits.length >= 7 ? '' : search, phone: digits.length >= 7 ? search : '' });
                setAdding(true);
              }}
            >
              <UserPlus size={18} aria-hidden="true" /> New customer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default CustomerModal;
