import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import BarcodeInput from '../components/BarcodeInput';
import ProductSearch from '../components/ProductSearch';
import ScannerStatus from '../components/ScannerStatus';
import { useGlobalScanner } from '../hooks/useScanner';
import { formatDateTime } from '../utils/dates';

// Record a delivery: scan or find the product, enter how many arrived,
// and the quantity is added to stock.
function ReceiveStockPage() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const quantityRef = useRef(null);

  // Load products and recent deliveries when the page opens.
  useEffect(() => {
    async function loadData() {
      try {
        const [productList, movements] = await Promise.all([api.get('/products'), api.get('/stock/movements?type=receive&limit=20')]);
        setProducts(productList);
        setHistory(movements);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Chooses the product being received, ready to type the quantity.
  function selectProduct(product) {
    setSelected(product);
    setError('');
    setMessage('');
    setTimeout(() => quantityRef.current?.focus(), 0);
  }

  // A barcode was scanned or typed: find and choose that product.
  function handleScan(code) {
    const product = products.find((p) => p.barcode === code);
    setBarcode('');
    if (product) selectProduct(product);
    else setError(`Product not found: no product has the barcode ${code}. Add it on the Products page first.`);
  }
  useGlobalScanner(handleScan, !loading);

  // Adds the delivery to stock.
  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) {
      setError('Scan or find the product first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await api.post('/stock/receive', { productId: selected._id, quantity: Number(quantity), note });
      setMessage(data.message);
      setProducts(products.map((p) => (p._id === data.product._id ? { ...p, ...data.product, category: p.category } : p)));
      setHistory(await api.get('/stock/movements?type=receive&limit=20'));
      setSelected(null);
      setQuantity('');
      setNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Loading products...</p>;

  return (
    <div className="page">
      <PageHeader title="Receive stock" lead="When a delivery arrives, scan each product and enter how many came in." />

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="receive-barcode">Scan the barcode</label>
          <BarcodeInput id="receive-barcode" value={barcode} onChange={setBarcode} onEnter={handleScan} autoFocus />
          <ScannerStatus readyText="Scanner ready: scan a product to choose it." />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="receive-search">Or find it by name</label>
          <ProductSearch id="receive-search" products={products} onSelect={selectProduct} />
        </div>

        <div className="span-all">
          {selected ? (
            <div className="notice">
              <span className="notice-title">{selected.name}</span>
              {selected.quantity} in stock now. Barcode {selected.barcode || 'none'}.
              <div className="btn-row">
                <button type="button" className="btn btn-small" onClick={() => setSelected(null)}>Choose another product</button>
              </div>
            </div>
          ) : (
            <p className="muted">No product chosen yet.</p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="receive-quantity">Quantity received</label>
          <input id="receive-quantity" ref={quantityRef} type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="receive-note">Note (optional)</label>
          <input id="receive-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Invoice number" />
        </div>
        <div className="span-all btn-row">
          <button type="submit" className="btn btn-primary btn-large" disabled={saving || !selected}>
            {saving ? 'Saving...' : 'Add to stock'}
          </button>
        </div>
      </form>

      <section className="panel panel-flush" aria-label="Recent deliveries">
        <div className="panel-head"><h2>Recent deliveries</h2></div>
        {history.length === 0 ? (
          <p className="empty muted">No deliveries recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th className="num">Added</th>
                  <th className="num">Stock after</th>
                  <th>Note</th>
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
                    <td>{m.note || <span className="muted">None</span>}</td>
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

export default ReceiveStockPage;
