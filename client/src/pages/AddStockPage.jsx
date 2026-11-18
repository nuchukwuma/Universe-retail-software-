import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import StockLookupBox from '../components/StockLookupBox';
import ScannerStatus from '../components/ScannerStatus';
import { useGlobalScanner } from '../hooks/useScanner';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime } from '../utils/dates';

const EMPTY_NEW_PRODUCT = { name: '', barcode: '', category: '', sellingPrice: '', reorderLevel: '5' };
const EMPTY_COST = { unitCost: '', supplierId: '' };

// Add stock with the barcode scanner, or by typing the product's name.
// - Scan (or type the name of) a product the shop already has: it is chosen
//   with quantity 1. Scanning it again adds 1; or type the number that arrived.
// - Scan a barcode nobody has yet: a "New product" form opens with the
//   barcode filled in. Saving creates the product and adds the stock.
// - Type a name nothing matches: the same form opens with the name filled
//   in and no barcode (for barcodes that will not scan; one can be typed).
function AddStockPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  // What is being added: null, { kind: 'existing', product } or { kind: 'new', barcode }
  const [current, setCurrent] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [newProduct, setNewProduct] = useState(EMPTY_NEW_PRODUCT);
  const [cost, setCost] = useState(EMPTY_COST); // what the delivery cost, and who sent it
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scanRef = useRef(null);
  const quantityRef = useRef(null);
  const nameRef = useRef(null);
  const priceRef = useRef(null);

  // Load products, categories and recent deliveries when the page opens.
  useEffect(() => {
    async function loadData() {
      try {
        const [productList, categoryList, movements, supplierList] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
          api.get('/stock/movements?type=receive&limit=20'),
          api.get('/suppliers').catch(() => []),
        ]);
        setProducts(productList);
        setSuppliers(supplierList);
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
      setCost({ unitCost: product.costPrice ? String(product.costPrice) : '', supplierId: product.supplier?._id || product.supplier || '' });
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
    setCost(EMPTY_COST);
    setQuantity('1');
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  // Opens the "New product" form for a typed name, with no barcode.
  function startNewProductByName(name) {
    setError('');
    setMessage('');
    setCurrent({ kind: 'new', barcode: '' });
    setNewProduct({ ...EMPTY_NEW_PRODUCT, name });
    setCost(EMPTY_COST);
    setQuantity('1');
    setTimeout(() => priceRef.current?.focus(), 0);
  }

  // Every scan (in the box or anywhere on the page) comes here.
  function handleScan(code) {
    const product = products.find((p) => p.barcode === code);
    if (product) chooseExisting(product);
    else if (current?.kind === 'new' && !current.barcode) setNewProduct((p) => ({ ...p, barcode: code })); // the typed-in product's barcode
    else startNewProduct(code);
  }
  useGlobalScanner(handleScan, !loading);

  // Goes back to "ready for the next scan".
  function finish(text) {
    setMessage(text);
    setCurrent(null);
    setQuantity('1');
    setNewProduct(EMPTY_NEW_PRODUCT);
    setCost(EMPTY_COST);
    setTimeout(() => scanRef.current?.focus(), 0);
  }

  // Adds the quantity to the stock of the chosen product.
  async function addToStock(product, amount) {
    const body = { productId: product._id, quantity: amount, note: '' };
    if (cost.unitCost !== '') body.unitCost = Number(cost.unitCost);
    if (cost.supplierId) body.supplierId = cost.supplierId;
    const data = await api.post('/stock/receive', body);
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
          barcode: current.barcode || newProduct.barcode.trim(),
          category: newProduct.category,
          sellingPrice: Number(newProduct.sellingPrice),
          costPrice: Number(cost.unitCost) || 0,
          supplier: cost.supplierId || null,
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
      <PageHeader title="Add stock" />

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <section className="panel" aria-label="Scan or type">
        <div className="field">
          <label className="field-label" htmlFor="stock-barcode">Scan a barcode or type a product name</label>
          <StockLookupBox
            id="stock-barcode"
            products={products}
            onBarcode={handleScan}
            onPick={chooseExisting}
            onNewProduct={startNewProductByName}
            inputRef={scanRef}
          />
          <ScannerStatus />
        </div>
      </section>

      {current?.kind === 'existing' && (
        <form className="panel form-grid" onSubmit={handleSubmit} aria-labelledby="existing-heading">
          <div className="span-all">
            <h2 id="existing-heading">{current.product.name}</h2>
            <p className="muted">
              {current.product.quantity} in stock, {formatNaira(current.product.sellingPrice)}{current.product.barcode ? `, ${current.product.barcode}` : ''}
            </p>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-quantity">How many arrived</label>
            <input id="stock-quantity" ref={quantityRef} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-cost">Cost each (₦)</label>
            <input id="stock-cost" type="number" min="0" step="any" inputMode="decimal" value={cost.unitCost} onChange={(e) => setCost((c) => ({ ...c, unitCost: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-supplier">Supplier</label>
            <select id="stock-supplier" value={cost.supplierId} onChange={(e) => setCost((c) => ({ ...c, supplierId: e.target.value }))}>
              <option value="">None</option>
              {suppliers.map((sup) => <option key={sup._id} value={sup._id}>{sup.name}</option>)}
            </select>
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
            {current.barcode
              ? <p className="muted">New barcode <strong>{current.barcode}</strong></p>
              : <p className="muted">No barcode</p>}
          </div>
          <div className="field span-all">
            <label className="field-label" htmlFor="new-name">Name</label>
            <input id="new-name" ref={nameRef} value={newProduct.name} onChange={(e) => setField('name', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="new-price">Selling price (₦)</label>
            <input id="new-price" ref={priceRef} type="number" min="0" step="any" inputMode="decimal" value={newProduct.sellingPrice} onChange={(e) => setField('sellingPrice', e.target.value)} required />
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
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-cost">Cost each (₦)</label>
            <input id="stock-cost" type="number" min="0" step="any" inputMode="decimal" value={cost.unitCost} onChange={(e) => setCost((c) => ({ ...c, unitCost: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="stock-supplier">Supplier</label>
            <select id="stock-supplier" value={cost.supplierId} onChange={(e) => setCost((c) => ({ ...c, supplierId: e.target.value }))}>
              <option value="">None</option>
              {suppliers.map((sup) => <option key={sup._id} value={sup._id}>{sup.name}</option>)}
            </select>
          </div>
          {!current.barcode && (
            <div className="field">
              <label className="field-label" htmlFor="new-barcode">Barcode (optional)</label>
              <input id="new-barcode" inputMode="numeric" value={newProduct.barcode} onChange={(e) => setField('barcode', e.target.value)} placeholder="Type the digits, or scan" />
            </div>
          )}
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
