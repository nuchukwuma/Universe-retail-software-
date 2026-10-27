import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import BarcodeInput from '../components/BarcodeInput';
import ProductImage from '../components/ProductImage';
import ProductSearch from '../components/ProductSearch';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime } from '../utils/dates';

// Page for recording a delivery: pick a product, enter how many arrived,
// and the quantity is added to stock.
function ReceiveStockPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load products, suppliers and recent deliveries when the page opens.
  useEffect(() => {
    async function loadData() {
      try {
        const [productList, supplierList, movements] = await Promise.all([
          api.get('/products'),
          api.get('/suppliers'),
          api.get('/stock/movements?type=receive&limit=20'),
        ]);
        setProducts(productList);
        setSuppliers(supplierList);
        setHistory(movements);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Chooses the product being received and pre-fills its cost price
  // and (if there is one) the supplier who supplies it.
  function selectProduct(product) {
    setSelected(product);
    setCostPrice(String(product.costPrice ?? ''));
    const usualSupplier = suppliers.find((s) => s.products.some((p) => p._id === product._id));
    setSupplierId(usualSupplier ? usualSupplier._id : '');
    setError('');
    setMessage('');
  }

  // Runs when a barcode is scanned: finds and selects that product.
  function handleScan(code) {
    const product = products.find((p) => p.barcode === code);
    setBarcode('');
    if (product) {
      selectProduct(product);
    } else {
      setError(`No product has the barcode ${code}.`);
    }
  }

  // Sends the delivery to the server and updates the page.
  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) {
      setError('Choose a product first.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = await api.post('/stock/receive', {
        productId: selected._id,
        quantity: Number(quantity),
        supplierId: supplierId || null,
        costPrice,
        note,
      });
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

  if (loading) return <p className="muted">Loading...</p>;

  return (
    <div>
      <h1 className="page-title">Receive Stock</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="span-2">
          <span className="field-label">Find the product</span>
          <ProductSearch products={products} onSelect={selectProduct} />
        </div>
        <div>
          <span className="field-label">…or scan its barcode</span>
          <BarcodeInput value={barcode} onChange={setBarcode} onEnter={handleScan} />
        </div>

        {selected && (
          <div className="span-full selected-product">
            <ProductImage product={selected} size={56} />
            <div>
              <strong>{selected.name}</strong>
              <div className="muted small">
                In stock now: {selected.quantity} · Current cost: {formatNaira(selected.costPrice)}
              </div>
            </div>
            <button type="button" className="btn btn-small" onClick={() => setSelected(null)}>Change</button>
          </div>
        )}

        <label>
          Quantity received *
          <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </label>
        <label>
          Cost price per item (₦)
          <input type="number" min="0" step="any" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
        </label>
        <label>
          Supplier
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Not recorded —</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </label>
        <label className="span-2">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Invoice number" />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !selected}>
            {saving ? 'Saving...' : 'Add to Stock'}
          </button>
        </div>
      </form>

      {suppliers.length === 0 && (
        <p className="muted small">Tip: add your suppliers on the <Link to="/suppliers">Suppliers page</Link>.</p>
      )}

      <div className="card">
        <h2>Recent deliveries</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th className="number">Qty</th>
                <th className="number">Cost</th>
                <th>Supplier</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => (
                <tr key={m._id}>
                  <td>{formatDateTime(m.createdAt)}</td>
                  <td>{m.productName}</td>
                  <td className="number">+{m.quantityChange}</td>
                  <td className="number">{m.costPrice != null ? formatNaira(m.costPrice) : '—'}</td>
                  <td>{m.supplier?.name || '—'}</td>
                  <td>{m.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.length === 0 && <p className="muted">No deliveries recorded yet.</p>}
      </div>
    </div>
  );
}

export default ReceiveStockPage;
