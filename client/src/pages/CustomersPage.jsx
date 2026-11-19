import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import PageHeader from '../components/PageHeader';
import { formatNaira } from '../utils/formatNaira';
import { formatDate } from '../utils/dates';

const EMPTY = { name: '', phone: '', points: '0', notes: '' };

// Loyalty customers: their points, visits and spending.
function CustomersPage() {
  const { settings } = useSettings();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setCustomers(await api.get('/customers'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/[^\d]/g, '');
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)));
  }, [customers, search]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEditing(customer) {
    setEditingId(customer._id);
    setForm({ name: customer.name, phone: customer.phone, points: String(customer.points), notes: customer.notes || '' });
    setError('');
    setMessage('');
    document.getElementById('customer-name')?.focus();
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, { ...form, points: Number(form.points) || 0 });
        setMessage(`${form.name} saved.`);
      } else {
        await api.post('/customers', { name: form.name, phone: form.phone, notes: form.notes });
        setMessage(`${form.name} added.`);
      }
      resetForm();
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    if (!window.confirm(`Delete ${customer.name}? Their points are lost; their receipts are kept.`)) return;
    try {
      const data = await api.delete(`/customers/${customer._id}`);
      setCustomers(customers.filter((c) => c._id !== customer._id));
      setMessage(data.message);
      if (editingId === customer._id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  const pointValue = Number(settings.loyaltyPointValue) || 0;

  return (
    <div className="page">
      <PageHeader title="Customers" />

      {!settings.loyaltyEnabled && (
        <div className="notice notice-warning">
          <span className="notice-title">Loyalty points are switched off</span>
          <div className="btn-row"><Link to="/settings" className="btn btn-small">Settings</Link></div>
        </div>
      )}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="columns">
        <section className="panel panel-flush" aria-label="Customers">
          <div className="panel-head">
            <div className="field">
              <label className="field-label visually-hidden" htmlFor="customers-search">Search</label>
              <input id="customers-search" type="search" placeholder="Name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <p>{shown.length} of {customers.length}</p>
          </div>
          {loading && <p className="loading">Loading...</p>}
          {!loading && customers.length === 0 && !error && <div className="empty"><p className="strong">No customers yet</p></div>}
          {shown.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="num">Points</th>
                    <th className="num">Visits</th>
                    <th className="num">Spent</th>
                    <th>Last visit</th>
                    <th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c._id} className={c._id === editingId ? 'is-highlighted' : undefined}>
                      <td>
                        <span className="cell-main">{c.name}</span>
                        <span className="cell-sub">{c.phone}</span>
                      </td>
                      <td className="num">
                        <span className="strong">{c.points.toLocaleString('en-NG')}</span>
                        {pointValue > 0 && c.points > 0 && <span className="cell-sub">{formatNaira(c.points * pointValue)}</span>}
                      </td>
                      <td className="num">{c.visits}</td>
                      <td className="num">{formatNaira(c.totalSpent)}</td>
                      <td>{c.lastVisitAt ? formatDate(c.lastVisitAt) : <span className="muted">-</span>}</td>
                      <td className="actions">
                        <button type="button" className="icon-btn" onClick={() => startEditing(c)} aria-label={`Edit ${c.name}`} title="Edit">
                          <Pencil size={18} aria-hidden="true" />
                        </button>
                        <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(c)} aria-label={`Delete ${c.name}`} title="Delete">
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form className="panel stack" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit customer' : 'Add a customer'}</h2>
          <div className="field">
            <label className="field-label" htmlFor="customer-name">Name</label>
            <input id="customer-name" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="customer-phone">Phone</label>
            <input id="customer-phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} required />
          </div>
          {editingId && (
            <div className="field">
              <label className="field-label" htmlFor="customer-points">Points</label>
              <input id="customer-points" className="input-number" type="number" min="0" step="1" value={form.points} onChange={(e) => setField('points', e.target.value)} />
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="customer-notes">Notes</label>
            <input id="customer-notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save' : 'Add customer'}</button>
            {editingId && <button type="button" className="btn" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomersPage;
