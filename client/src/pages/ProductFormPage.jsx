import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import BarcodeInput from '../components/BarcodeInput';
import ScannerStatus from '../components/ScannerStatus';
import PictureField from '../components/PictureField';
import ProductThumb from '../components/ProductThumb';
import { useGlobalScanner } from '../hooks/useScanner';
import { formatNaira } from '../utils/formatNaira';

const EMPTY_PRODUCT = {
  name: '',
  barcode: '',
  category: '',
  sellingPrice: '',
  costPrice: '',
  supplier: '',
  quantity: '0',
  reorderLevel: '5',
};

// Turns a product from the server into text values for the form boxes.
function productToForm(product) {
  return {
    name: product.name,
    barcode: product.barcode || '',
    category: product.category?._id || '',
    sellingPrice: String(product.sellingPrice ?? ''),
    costPrice: product.costPrice ? String(product.costPrice) : '',
    supplier: product.supplier?._id || product.supplier || '',
    quantity: String(product.quantity ?? 0),
    reorderLevel: String(product.reorderLevel ?? 0),
  };
}

// Turns the form's text values back into numbers for the server.
function formToProduct(form) {
  return {
    ...form,
    sellingPrice: Number(form.sellingPrice),
    costPrice: Number(form.costPrice) || 0,
    supplier: form.supplier || null,
    quantity: Number(form.quantity) || 0,
    reorderLevel: Number(form.reorderLevel) || 0,
  };
}

// Add product / Edit product.
// /products/new             -> add a new product
// /products/new?barcode=123 -> add a new product with the barcode filled in
// /products/:id/edit        -> edit an existing product
// Adding "&from=checkout" goes back to the till after saving.
// Scanning anywhere on this page fills in the barcode box.
function ProductFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const backTo = searchParams.get('from') === 'checkout' ? '/checkout' : '/products';

  const [form, setForm] = useState({ ...EMPTY_PRODUCT, barcode: searchParams.get('barcode') || '' });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [picture, setPicture] = useState(''); // URL or a new data URL
  const [savedPicture, setSavedPicture] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState('');

  // Load the categories (and the product, when editing).
  useEffect(() => {
    async function loadData() {
      try {
        const [categoryList, supplierList] = await Promise.all([api.get('/categories'), api.get('/suppliers').catch(() => [])]);
        setCategories(categoryList);
        setSuppliers(supplierList);
        if (isEditing) {
          const product = await api.get(`/products/${id}`);
          setForm(productToForm(product));
          setPicture(product.pictureUrl || '');
          setSavedPicture(product.pictureUrl || '');
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

  // A scan anywhere on the page fills in the barcode.
  useGlobalScanner((code) => {
    setField('barcode', code);
    setScanned(code);
  }, !loading);

  // Saves the product and goes back.
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.sellingPrice === '' || Number(form.sellingPrice) < 0) {
      setError('Enter the selling price.');
      return;
    }
    setSaving(true);
    try {
      const product = isEditing
        ? await api.put(`/products/${id}`, formToProduct(form))
        : await api.post('/products', formToProduct(form));
      if (picture !== savedPicture) {
        if (picture) await api.put(`/products/${product._id}/picture`, { picture });
        else await api.delete(`/products/${product._id}/picture`);
      }
      navigate(backTo);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const cost = Number(form.costPrice);
  const price = Number(form.sellingPrice);
  const margin = form.costPrice !== '' && cost > 0 && form.sellingPrice !== '' ? price - cost : null;
  const marginPercent = margin !== null && price > 0 ? Math.round((margin / price) * 100) : null;

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div className="page">
      <PageHeader title={isEditing ? `Edit ${form.name || 'product'}` : 'Add product'}>
        <Link to={backTo} className="btn">{backTo === '/checkout' ? 'Back to the till' : 'Back to products'}</Link>
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <h2 className="form-section">Product</h2>
        <div className="field span-all">
          <label className="field-label" htmlFor="product-name">Name</label>
          <input id="product-name" value={form.name} onChange={(e) => setField('name', e.target.value)} required autoFocus={!isEditing} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="product-barcode">Barcode</label>
          <BarcodeInput id="product-barcode" value={form.barcode} onChange={(code) => setField('barcode', code)} placeholder="Scan it, type it, or leave it empty" />
          <ScannerStatus readyText={scanned ? `Scanned ${scanned}` : 'Scanner ready'} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="product-category">Category</label>
          <select id="product-category" value={form.category} onChange={(e) => setField('category', e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        <div className="span-all">
          <PictureField
            id="product-picture"
            label="Picture"
            value={picture}
            onChange={setPicture}
            fallback={<ProductThumb product={{ name: form.name || '?' }} />}
          />
        </div>

        <h2 className="form-section">Price and stock</h2>
        <div className="field">
          <label className="field-label" htmlFor="product-price">Selling price (₦)</label>
          <input id="product-price" type="number" min="0" step="any" inputMode="decimal" value={form.sellingPrice} onChange={(e) => setField('sellingPrice', e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="product-cost">Cost price (₦)</label>
          <input id="product-cost" type="number" min="0" step="any" inputMode="decimal" value={form.costPrice} onChange={(e) => setField('costPrice', e.target.value)} />
          {margin !== null && <span className={margin < 0 ? 'field-help danger-text' : 'field-help'}>Profit {formatNaira(margin)} each{marginPercent !== null ? ` (${marginPercent}%)` : ''}</span>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="product-supplier">Supplier</label>
          <select id="product-supplier" value={form.supplier} onChange={(e) => setField('supplier', e.target.value)}>
            <option value="">None</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="product-quantity">Quantity in stock</label>
          <input id="product-quantity" type="number" step="1" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="product-low">Low-stock level</label>
          <input id="product-low" type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => setField('reorderLevel', e.target.value)} />
        </div>

        <div className="span-all btn-row">
          <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save product' : 'Add product'}
          </button>
          <Link to={backTo} className="btn btn-large">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
