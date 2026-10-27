import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import BarcodeInput from '../components/BarcodeInput';
import ImagePicker from '../components/ImagePicker';
import { formatNaira } from '../utils/formatNaira';
import { toDateInputValue } from '../utils/dates';

const EMPTY_PRODUCT = {
  name: '',
  barcode: '',
  category: '',
  image: '',
  costPrice: '',
  sellingPrice: '',
  wholesalePrice: '',
  quantity: '0',
  reorderLevel: '5',
  expiryDate: '',
};

// Turns a product from the server into text values for the form boxes.
function productToForm(product) {
  return {
    name: product.name,
    barcode: product.barcode || '',
    category: product.category?._id || '',
    image: product.image || '',
    costPrice: String(product.costPrice ?? ''),
    sellingPrice: String(product.sellingPrice ?? ''),
    wholesalePrice: product.wholesalePrice ? String(product.wholesalePrice) : '',
    quantity: String(product.quantity ?? 0),
    reorderLevel: String(product.reorderLevel ?? 0),
    expiryDate: toDateInputValue(product.expiryDate),
  };
}

// Turns the form's text values back into numbers for the server.
function formToProduct(form) {
  return {
    ...form,
    costPrice: Number(form.costPrice) || 0,
    sellingPrice: Number(form.sellingPrice),
    wholesalePrice: Number(form.wholesalePrice) || 0,
    quantity: Number(form.quantity) || 0,
    reorderLevel: Number(form.reorderLevel) || 0,
  };
}

// The Add Product / Edit Product page.
// /products/new             -> add a new product
// /products/new?barcode=123 -> add a new product with the barcode filled in
// /products/:id/edit        -> edit an existing product
// Adding "&from=checkout" goes back to the checkout after saving.
function ProductFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const backTo = searchParams.get('from') === 'checkout' ? '/checkout' : '/products';

  const [form, setForm] = useState({ ...EMPTY_PRODUCT, barcode: searchParams.get('barcode') || '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load the categories (and the product, when editing).
  useEffect(() => {
    async function loadData() {
      try {
        const categoryList = await api.get('/categories');
        setCategories(categoryList);
        if (isEditing) {
          const product = await api.get(`/products/${id}`);
          setForm(productToForm(product));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isEditing]);

  // Updates one field of the form.
  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Saves the product and goes back to the product list.
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.sellingPrice === '' || Number(form.sellingPrice) < 0) {
      setError('Enter a selling price.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/products/${id}`, formToProduct(form));
      } else {
        await api.post('/products', formToProduct(form));
      }
      navigate(backTo);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  const cost = Number(form.costPrice) || 0;
  const price = Number(form.sellingPrice) || 0;
  const profit = price - cost;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEditing ? 'Edit Product' : 'Add Product'}</h1>
        <Link to={backTo} className="btn">← Back</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        <h3 className="form-section">Details</h3>
        <label className="span-2">
          Product name *
          <input value={form.name} onChange={(e) => setField('name', e.target.value)} required autoFocus={!isEditing} />
        </label>

        <label htmlFor="barcode-field">
          Barcode
          <BarcodeInput
            id="barcode-field"
            value={form.barcode}
            onChange={(code) => setField('barcode', code)}
            placeholder="Scan, type, or leave empty"
          />
        </label>

        <label>
          Category
          <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>

        <h3 className="form-section">Prices</h3>
        <label>
          Cost price (₦)
          <input type="number" min="0" step="any" value={form.costPrice} onChange={(e) => setField('costPrice', e.target.value)} />
        </label>

        <label>
          Selling price (₦) *
          <input type="number" min="0" step="any" value={form.sellingPrice} onChange={(e) => setField('sellingPrice', e.target.value)} required />
        </label>

        <label>
          Wholesale price (₦)
          <input
            type="number"
            min="0"
            step="any"
            value={form.wholesalePrice}
            onChange={(e) => setField('wholesalePrice', e.target.value)}
            placeholder="Same as selling price"
          />
        </label>

        <div className="profit-hint">
          {price > 0 && (
            profit >= 0 ? (
              <span>Profit per item: <strong>{formatNaira(profit)}</strong>{cost > 0 && ` (${Math.round((profit / cost) * 100)}%)`}</span>
            ) : (
              <span className="text-error">Warning: selling price is lower than cost price.</span>
            )
          )}
        </div>

        <h3 className="form-section">Stock</h3>
        <label>
          Quantity in stock
          <input type="number" step="1" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} />
        </label>

        <label>
          Reorder level
          <input type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => setField('reorderLevel', e.target.value)} />
        </label>

        <label>
          Expiry date
          <input type="date" value={form.expiryDate} onChange={(e) => setField('expiryDate', e.target.value)} />
        </label>

        <h3 className="form-section">Picture</h3>
        <div className="span-full">
          <ImagePicker value={form.image} onChange={(url) => setField('image', url)} />
        </div>

        <div className="span-full form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Product'}
          </button>
          <Link to={backTo} className="btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
