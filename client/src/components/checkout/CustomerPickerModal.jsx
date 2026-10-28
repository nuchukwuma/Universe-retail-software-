import { useEffect, useId, useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';
import CustomerForm from '../CustomerForm';

// Choose a saved customer (search by name or phone), add a new one, or
// just write a walk-in customer's name on the bill.
// Calls onSelect(customer) for a saved customer, onWalkIn(name) otherwise.
function CustomerPickerModal({ onSelect, onWalkIn, onClose }) {
  const formId = useId();
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
      onSelect(await api.post('/customers', details));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const typedName = /\d/.test(search) ? '' : search.trim();

  if (adding) {
    return (
      <Modal
        title="Add a customer"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn push-left" onClick={() => setAdding(false)}>Back to search</button>
            <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add and use customer'}</button>
          </>
        }
      >
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <CustomerForm formId={formId} initial={{ name: typedName, phone: /\d/.test(search) ? search : '' }} onSave={handleAdd} />
      </Modal>
    );
  }

  return (
    <Modal
      title="Customer"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn push-left" onClick={() => onWalkIn(typedName)}>
            {typedName ? `Use "${typedName}" as a walk-in name` : 'Walk-in customer'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>Add a new customer</button>
        </>
      }
    >
      <div className="field">
        <label className="field-label" htmlFor={`${formId}-search`}>Search by name or phone</label>
        <input id={`${formId}-search`} type="search" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus autoComplete="off" />
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {loading && <p className="loading">Searching customers...</p>}
      {!loading && results.length === 0 && <p>No saved customer matches. Add them as a new customer, or use the name for this bill only.</p>}
      {!loading && results.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th><span className="visually-hidden">Choose</span></th>
            </tr>
          </thead>
          <tbody>
            {results.map((customer) => (
              <tr key={customer._id}>
                <td className="cell-main">{customer.name}</td>
                <td>{customer.phone || 'No phone'}</td>
                <td className="actions">
                  <button type="button" className="btn btn-small" onClick={() => onSelect(customer)}>
                    Use<span className="visually-hidden"> {customer.name}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export default CustomerPickerModal;
