import { useEffect, useState } from 'react';
import { api } from '../api/api';
import ProductChecklist from '../components/ProductChecklist';

const EMPTY_FORM = { name: '', phone: '', address: '', notes: '', products: [] };

// Turns a Nigerian phone number like 0803... into 234803... for WhatsApp links.
function toWhatsAppNumber(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
}

// Page for keeping a list of suppliers and the products they supply.
function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load suppliers and products when the page opens.
  useEffect(() => {
    async function loadData() {
      try {
        const [supplierList, productList] = await Promise.all([api.get('/suppliers'), api.get('/products')]);
        setSuppliers(supplierList);
        setProducts(productList);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Opens an empty form for a new supplier.
  function startAdding() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  // Opens the form filled with an existing supplier.
  function startEditing(supplier) {
    setEditingId(supplier._id);
    setForm({
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      notes: supplier.notes,
      products: supplier.products.map((p) => p._id),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Saves the supplier form (new or edited).
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const updated = await api.put(`/suppliers/${editingId}`, form);
        setSuppliers(suppliers.map((s) => (s._id === updated._id ? updated : s)));
        setMessage(`${updated.name} updated.`);
      } else {
        const created = await api.post('/suppliers', form);
        setSuppliers([...suppliers, created].sort((a, b) => a.name.localeCompare(b.name)));
        setMessage(`${created.name} added.`);
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Deletes a supplier after asking for confirmation.
  async function handleDelete(supplier) {
    if (!window.confirm(`Delete the supplier "${supplier.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${supplier._id}`);
      setSuppliers(suppliers.filter((s) => s._id !== supplier._id));
      setMessage(`${supplier.name} deleted.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Suppliers</h1>
        {!showForm && <button type="button" className="btn btn-primary" onClick={startAdding}>+ Add Supplier</button>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {showForm && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <h2 className="form-grid-title">{editingId ? 'Edit supplier' : 'New supplier'}</h2>
          <label>
            Name *
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Phone number
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 123 4567" />
          </label>
          <label className="span-2">
            Address
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="span-full">
            Notes
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Delivers every Tuesday" />
          </label>
          <div className="span-full">
            <span className="field-label">Products supplied</span>
            <ProductChecklist
              products={products}
              selectedIds={form.products}
              onChange={(ids) => setForm({ ...form, products: ids })}
            />
          </div>
          <div className="span-full form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Supplier'}
            </button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading suppliers...</p>
      ) : (
        <div className="supplier-list">
          {suppliers.map((supplier) => (
            <div key={supplier._id} className="card supplier-card">
              <div className="supplier-card-top">
                <div>
                  <h3>{supplier.name}</h3>
                  {supplier.phone && (
                    <p>
                      <a href={`tel:${supplier.phone}`}>📞 {supplier.phone}</a>
                      {' · '}
                      <a href={`https://wa.me/${toWhatsAppNumber(supplier.phone)}`} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    </p>
                  )}
                  {supplier.address && <p className="muted small">{supplier.address}</p>}
                  {supplier.notes && <p className="muted small">{supplier.notes}</p>}
                </div>
                <div className="actions">
                  <button type="button" className="btn btn-small" onClick={() => startEditing(supplier)}>Edit</button>
                  <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(supplier)}>Delete</button>
                </div>
              </div>
              <div className="chips">
                {supplier.products.map((p) => <span key={p._id} className="chip">{p.name}</span>)}
                {supplier.products.length === 0 && <span className="muted small">No products linked yet.</span>}
              </div>
            </div>
          ))}
          {suppliers.length === 0 && <p className="muted">No suppliers yet.</p>}
        </div>
      )}
    </div>
  );
}

export default SuppliersPage;
