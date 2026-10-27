import { useEffect, useState } from 'react';
import { api } from '../api/api';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import CustomerHistoryModal from '../components/CustomerHistoryModal';
import { formatNaira } from '../utils/formatNaira';
import { formatDate } from '../utils/dates';

// Back office page listing customers, with their purchase history.
function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  // Which pop-up is open: null, { type: 'add' }, { type: 'edit', customer } or { type: 'history', customer }
  const [modal, setModal] = useState(null);

  // Search the server 300ms after the user stops typing.
  useEffect(() => {
    const timer = setTimeout(loadCustomers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetches customers matching the search box.
  async function loadCustomers() {
    try {
      setCustomers(await api.get(`/customers?search=${encodeURIComponent(search)}`));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Saves the add/edit form.
  async function handleSave(details) {
    setSaving(true);
    try {
      if (modal.type === 'edit') {
        await api.put(`/customers/${modal.customer._id}`, details);
        setMessage(`${details.name} updated.`);
      } else {
        await api.post('/customers', details);
        setMessage(`${details.name} added.`);
      }
      setModal(null);
      setError('');
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Deletes a customer after confirming.
  async function handleDelete(customer) {
    if (!window.confirm(`Delete ${customer.name}? Their old receipts will keep the name.`)) return;
    try {
      await api.delete(`/customers/${customer._id}`);
      setCustomers(customers.filter((c) => c._id !== customer._id));
      setMessage(`${customer.name} deleted.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>+ Add Customer</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card filter-bar">
        <input type="search" placeholder="Search by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading customers...</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="number">Visits</th>
                  <th className="number">Total spent</th>
                  <th>Last visit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id}>
                    <td><strong>{customer.name}</strong></td>
                    <td>{customer.phone || <span className="muted">—</span>}</td>
                    <td className="number">{customer.visits}</td>
                    <td className="number">{formatNaira(customer.totalSpent)}</td>
                    <td>{customer.lastVisit ? formatDate(customer.lastVisit) : <span className="muted">Never</span>}</td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn btn-small" onClick={() => setModal({ type: 'history', customer })}>History</button>
                        <button type="button" className="btn btn-small" onClick={() => setModal({ type: 'edit', customer })}>Edit</button>
                        <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(customer)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && <p className="muted">No customers found.</p>}
          </div>
        )}
      </div>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <Modal title={modal.type === 'edit' ? 'Edit customer' : 'Add customer'} onClose={() => setModal(null)}>
          <CustomerForm initial={modal.customer} saving={saving} onSave={handleSave} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'history' && <CustomerHistoryModal customer={modal.customer} onClose={() => setModal(null)} />}
    </div>
  );
}

export default CustomersPage;
