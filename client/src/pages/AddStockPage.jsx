import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import BarcodeInput from '../components/BarcodeInput';
import ProductSearch from '../components/ProductSearch';
import ScannerStatus from '../components/ScannerStatus';
import { useGlobalScanner } from '../hooks/useScanner';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime } from '../utils/dates';

const EMPTY_NEW_PRODUCT = { name: '', category: '', sellingPrice: '', reorderLevel: '5' };

// Add stock with the barcode scanner.
// - Scan a product the shop already has: it is chosen with quantity 1.
//   Scanning it again adds 1; or type the number that arrived.
// - Scan a barcode nobody has yet: a "New product" form opens with the
//   barcode filled in. Saving creates the product and adds the stock.
function AddStockPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  // What is being added: null, { kind: 'existing', product } or { kind: 'new', barcode }
  const [current, setCurrent] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [newProduct, setNewProduct] = useState(EMPTY_NEW_PRODUCT);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scanRef = useRef(null);
  const quantityRef = useRef(null);
  const nameRef = useRef(null);

  // Load products, categories and recent deliveries when the page opens.
  useEffect(() => {
    async function loadData() {
      try {
        const [productList, categoryList, movements] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get('/stock/movements?type=receive&limit=20'),
        ]);
        setProducts(productList);
        setCategories(categoryList);
        setHistory(movements);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Chooses a product the shop already has. Choosing the same one again adds 1.
  function chooseExisting(product) {
    setError('');
    setMessage('');
    if (current?.kind === 'existing' && current.product._id === product._id) {
      setQuantity((q) => String((Number(q) || 0) + 1));
    } else {
      setCurrent({ kind: 'existing', product });
      setQuantity('1');
    }
    setTimeout(() => quantityRef.current?.select(), 0);
  }

  // Opens the "New product" form for a barcode nobody has yet.
  function startNewProduct(code) {
    setError('');
    setMessage('');
    if (current?.kind === 'new' && current.barcode === code) {
      setQuantity((q) => String((Number(q) || 0) + 1));
      return;
    }
    if (current?.kind === 'new' && newProduct.name.trim()) {
      setError(`Finish the new product ${newProduct.name} first (save or cancel it), then scan the next one.`);
      return;
    }
    setCurrent({ kind: 'new', barcode: code });
    setNewProduct(EMPTY_NEW_PRODUCT);
    setQuantity('1');
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  // Every scan (in the barcode box or anywhere on the page) comes here.
  function handleScan(code) {
    setBarcode('');
    const product = products.find((p) => p.barcode === code);
    if (product) chooseExisting(product);
    else startNewProduct(code);
  }
  useGlobalScanner(handleScan, !loading);

  // Goes back to "ready for the next scan".
  function finish(text) {
    setMessage(text);
    setCurrent(null);
    setQuantity('1');
    setNewProduct(EMPTY_NEW_PRODUCT);
    setTimeout(() => scanRef.current?.focus(), 0);
  }

  // Adds the quantity to the stock of the chosen product.
  async function addToStock(product, amount) {
    const data = await api.post('/stock/receive', { productId: product._id, quantity: amount, note: '' });
    setProducts((list) => {
      const exists = list.some((p) => p._id === data.product._id);
      const updated = { ...product, ...data.product, category: product.category };
      return exists ? list.map((p) => (p._id === updated._id ? updated : p)) : [...list, updated].sort((a, b) => a.name.localeCompare(b.name));
    });
    setHistory(await api.get('/stock/movements?type=receive&limit=20'));
    return data;
  }

  // Saves: adds stock to an existing product, or creates the new product first.
  async function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Enter how many arrived (a whole number above 0).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (current.kind === 'existing') {
        const data = await addToStock(current.product, amount);
        finish(data.message);
      } else {
        if (!newProduct.name.trim()) throw new Error('Enter the product name.');
        if (newProduct.sellingPrice === '' || Number(newProduct.sellingPrice) < 0) throw new Error('Enter the selling price.');
        const created = await api.post('/products', {
          name: newProduct.name.trim(),
          barcode: current.barcode,
          category: newProduct.category,
          sellingPrice: Number(newProduct.sellingPrice),
          quantity: 0,
          reorderLevel: Number(newProduct.reorderLevel) || 0,
        });
        await addToStock(created, amount);
        finish(`New product ${created.name} added with ${amount} in stock.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Updates one field of the new-product form.
  function setField(name, value) {
    setNewProduct((p) => ({ ...p, [name]: value }));
  }

  if (loading) return <p className="loading">Loading products...</p>;

  return (
    <div className="page">
      <PageHeader title="Add stock" lead="Scan each product as it arrives. A barcode the shop does not have yet becomes a new product." />

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <section className="panel form-grid" aria-label="Scan">
        <div className="field">
          <label className="field-label" htmlFor="stock-barcode">Scan the barcode</label>
          <BarcodeInput id="stock-barcode" value={barcode} onChange={setBarcode} onEnter={handleScan} inputRef={scanRef} autoFocus />
          <ScannerStatus readyText="Scanner ready: scan a product to add it to stock." />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="stock-search">No barcode? Find it by name</label>
          <ProductSearch id="stock-search" products={products} onSelect={chooseExisting} />
        </div>
      </section>

      {current?.kind === 'existing' && (
        <form className="panel form-grid" onSubmit={handleSubmit} aria-labelledby="existing-heading">
          <div className="span-all">
            <h2 id="existing-heading">{current.product.name}</h2>
            <p className="muted">
              {current.product.quantity} in stock now. {formatNaira(current.product.sellingPrice)}. Barcode {current.product.barcode || 'none'}.
            </p>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-quantity">How many arrived</label>
            <input id="stock-quantity" ref={quantityRef} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <span className="field-help">Scan it again to add 1 more, or type the number.</span>
          </div>
          <div className="span-all btn-row">
            <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
              {saving ? 'Saving...' : `Add ${Number(quantity) || 0} to stock`} <span className="key">Enter</span>
            </button>
            <button type="button" className="btn btn-large" onClick={() => finish('')}>Cancel</button>
          </div>
        </form>
      )}

      {current?.kind === 'new' && (
        <form className="panel form-grid" onSubmit={handleSubmit} aria-labelledby="new-heading">
          <div className="span-all">
            <h2 id="new-heading">New product</h2>
            <p className="muted">No product has the barcode <strong>{current.barcode}</strong> yet. Fill in its details to add it.</p>
          </div>
          <div className="field span-all">
            <label className="field-label" htmlFor="new-name">Name</label>
            <input id="new-name" ref={nameRef} value={newProduct.name} onChange={(e) => setField('name', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="new-price">Selling price (₦)</label>
            <input id="new-price" type="number" min="0" step="any" inputMode="decimal" value={newProduct.sellingPrice} onChange={(e) => setField('sellingPrice', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="new-category">Category</label>
            <select id="new-category" value={newProduct.category} onChange={(e) => setField('category', e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-quantity">How many arrived</label>
            <input id="stock-quantity" ref={quantityRef} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <span className="field-help">Scan the same barcode again to add 1 more.</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="new-low">Low-stock level</label>
            <input id="new-low" type="number" min="0" step="1" value={newProduct.reorderLevel} onChange={(e) => setField('reorderLevel', e.target.value)} />
          </div>
          <div className="span-all btn-row">
            <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
              {saving ? 'Saving...' : 'Save product and add to stock'} <span className="key">Enter</span>
            </button>
            <button type="button" className="btn btn-large" onClick={() => finish('')}>Cancel</button>
          </div>
        </form>
      )}

      {!current && <p className="muted">Waiting for a scan.</p>}

      <section className="panel panel-flush" aria-labelledby="recent-heading">
        <div className="panel-head"><h2 id="recent-heading">Recently added</h2></div>
        {history.length === 0 ? (
          <p className="empty muted">Nothing added yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th className="num">Added</th>
                  <th className="num">Stock after</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m._id}>
                    <td>{formatDateTime(m.createdAt)}</td>
                    <td className="cell-main">{m.productName}</td>
                    <td className="num">+{m.quantityChange}</td>
                    <td className="num">{m.quantityAfter}</td>
                    <td>{m.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AddStockPage;
