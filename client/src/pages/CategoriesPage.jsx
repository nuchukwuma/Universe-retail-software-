import { useEffect, useState } from 'react';
import { api } from '../api/api';
import ImagePicker from '../components/ImagePicker';

const EMPTY_FORM = { name: '', icon: '🛒', image: '' };

// Some ready-made icons to pick from (you can also type any emoji).
const ICON_CHOICES = ['🍚', '🫒', '🥫', '🌶️', '🧽', '🥤', '🧴', '🍞', '🥩', '🐟', '🥚', '🧃', '🍫', '🧼', '👶', '💄', '🛒'];

// Page for adding, renaming and deleting product categories.
function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
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

  // Fills the form with a category so it can be changed.
  function startEditing(category) {
    setEditingId(category._id);
    setForm({ name: category.name, icon: category.icon || '🛒', image: category.image || '' });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Empties the form and leaves edit mode.
  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  // Saves a new category, or the changes to the one being edited.
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
        setMessage(`Category "${form.name}" updated.`);
      } else {
        await api.post('/categories', form);
        setMessage(`Category "${form.name}" added.`);
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
    <div>
      <h1 className="page-title">Categories</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        <h2 className="form-grid-title">{editingId ? 'Edit category' : 'Add a category'}</h2>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Icon (used if no picture)
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
        </label>
        <div className="span-full icon-choices">
          {ICON_CHOICES.map((icon) => (
            <button
              key={icon}
              type="button"
              className={form.icon === icon ? 'icon-choice selected' : 'icon-choice'}
              onClick={() => setForm({ ...form, icon })}
            >
              {icon}
            </button>
          ))}
        </div>
        <div className="span-full">
          <span className="field-label">Picture (optional)</span>
          <ImagePicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} placeholder={form.icon} />
        </div>
        <div className="span-full form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Category'}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={resetForm}>Cancel</button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="muted">Loading categories...</p>
      ) : (
        <div className="category-grid">
          {categories.map((category) => (
            <div key={category._id} className="card category-card">
              <div className="category-card-image">
                {category.image ? <img src={category.image} alt="" /> : <span>{category.icon}</span>}
              </div>
              <strong>{category.name}</strong>
              <span className="muted small">{category.productCount} product(s)</span>
              <div className="actions">
                <button type="button" className="btn btn-small" onClick={() => startEditing(category)}>Edit</button>
                <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(category)}>Delete</button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="muted">No categories yet. Add your first one above.</p>}
        </div>
      )}
    </div>
  );
}

export default CategoriesPage;
