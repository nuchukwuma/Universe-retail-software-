import { useEffect, useId, useState } from 'react';
import { api } from '../api/api';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import CustomerForm from '../components/CustomerForm';
import CustomerHistoryModal from '../components/CustomerHistoryModal';
import { formatNaira } from '../utils/formatNaira';
import { formatDate } from '../utils/dates';

// Saved customers, how often they come and what they have bought.
function CustomersPage() {
  const formId = useId();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  // Which dialog is open: null, { type: 'add' }, { type: 'edit', customer } or { type: 'history', customer }
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
        setMessage(`${details.name} saved.`);
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
    if (!window.confirm(`Delete ${customer.name}? Their old receipts keep the name.`)) return;
    try {
      await api.delete(`/customers/${customer._id}`);
      setCustomers(customers.filter((c) => c._id !== customer._id));
      setMessage(`${customer.name} deleted.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Customers" lead="Regular customers, their visits and everything they have bought.">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>Add customer</button>
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="panel toolbar">
        <div className="field">
          <label className="field-label" htmlFor="customers-search">Search</label>
          <input id="customers-search" type="search" placeholder="Name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <section className="panel panel-flush" aria-label="Customer list">
        {loading && <p className="loading">Loading customers...</p>}
        {!loading && customers.length === 0 && (
          <p className="empty muted">{search ? `No customer matches "${search}".` : 'No customers yet. Add one here, or at the till with Customer (F3).'}</p>
        )}
        {customers.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="num">Visits</th>
                  <th className="num">Total spent</th>
                  <th>Last visit</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id}>
                    <td className="cell-main">{customer.name}</td>
                    <td>{customer.phone || <span className="muted">None</span>}</td>
                    <td className="num">{customer.visits}</td>
                    <td className="num">{formatNaira(customer.totalSpent)}</td>
                    <td>{customer.lastVisit ? formatDate(customer.lastVisit) : <span className="muted">Never</span>}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-quiet" onClick={() => setModal({ type: 'history', customer })}>History</button>
                      <button type="button" className="btn btn-quiet" onClick={() => setModal({ type: 'edit', customer })}>Edit</button>
                      <button type="button" className="btn btn-quiet btn-danger" onClick={() => handleDelete(customer)}>
                        Delete<span className="visually-hidden"> {customer.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <Modal
          title={modal.type === 'edit' ? `Edit ${modal.customer.name}` : 'Add a customer'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save customer'}</button>
            </>
          }
        >
          <CustomerForm formId={formId} initial={modal.customer} onSave={handleSave} />
        </Modal>
      )}
      {modal?.type === 'history' && <CustomerHistoryModal customer={modal.customer} onClose={() => setModal(null)} />}
    </div>
  );
}

export default CustomersPage;
