import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';
import CustomerForm from '../CustomerForm';

// Pop-up for choosing a saved customer (search by name or phone)
// or adding a new one. Calls onSelect(customer) or onSelect(null) for walk-in.
function CustomerPickerModal({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Search the server 300ms after the user stops typing.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await api.get(`/customers?search=${encodeURIComponent(search)}`));
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Saves a new customer and chooses them straight away.
  async function handleAdd(details) {
    setSaving(true);
    setError('');
    try {
      const customer = await api.post('/customers', details);
      onSelect(customer);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={adding ? 'Add new customer' : 'Choose customer'} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      {adding ? (
        <CustomerForm
          initial={{ name: /\d/.test(search) ? '' : search, phone: /\d/.test(search) ? search : '' }}
          saving={saving}
          submitLabel="Add & Use Customer"
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <>
          <input
            type="search"
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="full-width"
          />
          <ul className="picker-list">
            {loading && <li className="muted">Searching...</li>}
            {!loading && results.length === 0 && <li className="muted">No customer found.</li>}
            {!loading &&
              results.map((customer) => (
                <li key={customer._id}>
                  <button type="button" onClick={() => onSelect(customer)}>
                    <strong>{customer.name}</strong>
                    <span className="muted">{customer.phone || 'No phone'}</span>
                  </button>
                </li>
              ))}
          </ul>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>+ Add New Customer</button>
            <button type="button" className="btn" onClick={() => onSelect(null)}>Walk-in (no customer)</button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default CustomerPickerModal;
