import { useEffect, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';

// Add, rename and delete product categories (e.g. Skincare, Hair care).
function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load the categories when the page opens.
  useEffect(() => {
    loadCategories();
  }, []);

  // Fetches the category list from the server.
  async function loadCategories() {
    try {
      setCategories(await api.get('/categories'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Puts a category in the form so it can be renamed.
  function startEditing(category) {
    setEditingId(category._id);
    setName(category.name);
    setError('');
    setMessage('');
    document.getElementById('category-name')?.focus();
  }

  // Empties the form and leaves edit mode.
  function resetForm() {
    setEditingId(null);
    setName('');
  }

  // Saves a new category, or the new name of the one being edited.
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, { name });
        setMessage(`Category renamed to "${name}".`);
      } else {
        await api.post('/categories', { name });
        setMessage(`Category "${name}" added.`);
      }
      resetForm();
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Deletes a category after asking for confirmation.
  async function handleDelete(category) {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    try {
      await api.delete(`/categories/${category._id}`);
      setCategories(categories.filter((c) => c._id !== category._id));
      setMessage(`Category "${category.name}" deleted.`);
      setError('');
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  }

  return (
    <div className="page">
      <PageHeader title="Categories" lead="Groups of products. Cashiers use them to find items without a barcode." />

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="columns">
        <section className="panel panel-flush" aria-label="Categories">
          {loading && <p className="loading">Loading categories...</p>}
          {!loading && categories.length === 0 && !error && (
            <div className="empty">
              <p className="strong">No categories yet.</p>
              <p className="muted">Add your first one with the form.</p>
            </div>
          )}
          {categories.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Products</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id} className={category._id === editingId ? 'is-highlighted' : undefined}>
                    <td className="cell-main">{category.name}</td>
                    <td className="num">{category.productCount}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-quiet" onClick={() => startEditing(category)}>
                        Rename<span className="visually-hidden"> {category.name}</span>
                      </button>
                      <button type="button" className="btn btn-quiet btn-danger" onClick={() => handleDelete(category)}>
                        Delete<span className="visually-hidden"> {category.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <form className="panel stack" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Rename category' : 'Add a category'}</h2>
          <div className="field">
            <label className="field-label" htmlFor="category-name">Name</label>
            <input id="category-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Hair care" />
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save name' : 'Add category'}
            </button>
            {editingId && <button type="button" className="btn" onClick={resetForm}>Cancel</button>}
          </div>
          <p className="muted small">A category can only be deleted when it has no products.</p>
        </form>
      </div>
    </div>
  );
}

export default CategoriesPage;
