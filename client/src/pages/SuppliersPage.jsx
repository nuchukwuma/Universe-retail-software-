import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' };

// The shop's suppliers: who they are and how to reach them.
function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      setSuppliers(await api.get('/suppliers'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEditing(supplier) {
    setEditingId(supplier._id);
    setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, supplier[k] || ''])) });
    setError('');
    setMessage('');
    document.getElementById('supplier-name')?.focus();
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
        await api.put(`/suppliers/${editingId}`, form);
        setMessage(`${form.name} saved.`);
      } else {
        await api.post('/suppliers', form);
        setMessage(`${form.name} added.`);
      }
      resetForm();
      await loadSuppliers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier) {
    if (!window.confirm(`Delete the supplier "${supplier.name}"?`)) return;
    try {
      const data = await api.delete(`/suppliers/${supplier._id}`);
      setSuppliers(suppliers.filter((s) => s._id !== supplier._id));
      setMessage(data.message);
      setError('');
      if (editingId === supplier._id) resetForm();
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  }

  return (
    <div className="page">
      <PageHeader title="Suppliers">
        <Link to="/purchases/new" className="btn">New purchase order</Link>
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="columns">
        <section className="panel panel-flush" aria-label="Suppliers">
          {loading && <p className="loading">Loading...</p>}
          {!loading && suppliers.length === 0 && !error && (
            <div className="empty"><p className="strong">No suppliers yet</p></div>
          )}
          {suppliers.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Phone</th>
                    <th className="num">Products</th>
                    <th className="num">Open orders</th>
                    <th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier._id} className={supplier._id === editingId ? 'is-highlighted' : undefined}>
                      <td>
                        <span className="cell-main">{supplier.name}</span>
                        {(supplier.email || supplier.address) && (
                          <span className="cell-sub">{[supplier.email, supplier.address].filter(Boolean).join(', ')}</span>
                        )}
                      </td>
                      <td className="nowrap">{supplier.phone ? <a href={`tel:${supplier.phone.replace(/\s/g, '')}`}>{supplier.phone}</a> : <span className="muted">-</span>}</td>
                      <td className="num">{supplier.productCount}</td>
                      <td className="num">
                        {supplier.openOrders > 0
                          ? <Link to={`/purchases?supplier=${supplier._id}`}>{supplier.openOrders}</Link>
                          : <span className="muted">0</span>}
                      </td>
                      <td className="actions">
                        <button type="button" className="icon-btn" onClick={() => startEditing(supplier)} aria-label={`Edit ${supplier.name}`} title="Edit">
                          <Pencil size={18} aria-hidden="true" />
                        </button>
                        <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(supplier)} aria-label={`Delete ${supplier.name}`} title="Delete">
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
          <h2>{editingId ? 'Edit supplier' : 'Add a supplier'}</h2>
          <div className="field">
            <label className="field-label" htmlFor="supplier-name">Name</label>
            <input id="supplier-name" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="supplier-phone">Phone</label>
            <input id="supplier-phone" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="supplier-email">Email</label>
            <input id="supplier-email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="supplier-address">Address</label>
            <input id="supplier-address" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="supplier-notes">Notes</label>
            <textarea id="supplier-notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save' : 'Add supplier'}
            </button>
            {editingId && <button type="button" className="btn" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuppliersPage;
