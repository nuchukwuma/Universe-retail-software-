import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import BarcodeInput from '../components/BarcodeInput';
import ProductSearch from '../components/ProductSearch';

// The count is saved in the browser so a page refresh does not lose it.
const SAVED_COUNT_KEY = 'pos_stock_count';

// Reads a count saved earlier in this browser (or an empty count).
function loadSavedCount() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_COUNT_KEY)) || {};
  } catch {
    return {};
  }
}

// Page for counting what is really on the shelves. Scan each item
// (every scan adds 1), then compare with what the system thinks.
function StockCountPage() {
  const [products, setProducts] = useState([]);
  // counts looks like { productId: numberCounted }
  const [counts, setCounts] = useState(loadSavedCount);
  const [barcode, setBarcode] = useState('');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scanBoxRef = useRef(null);

  // Load the products (with their system quantities).
  useEffect(() => {
    loadProducts();
  }, []);

  // Save the count in the browser every time it changes.
  useEffect(() => {
    localStorage.setItem(SAVED_COUNT_KEY, JSON.stringify(counts));
  }, [counts]);

  // Fetches the latest product list from the server.
  async function loadProducts() {
    try {
      setProducts(await api.get('/products'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Adds "amount" to the counted number for one product.
  function addToCount(productId, amount) {
    setCounts((current) => ({ ...current, [productId]: Math.max(0, (current[productId] || 0) + amount) }));
  }

  // Sets the counted number for one product (typed in by hand).
  function setCount(productId, value) {
    setCounts((current) => ({ ...current, [productId]: Math.max(0, Number(value) || 0) }));
  }

  // Runs on every scan: finds the product and adds 1 to its count.
  function handleScan(code) {
    setBarcode('');
    const product = products.find((p) => p.barcode === code);
    if (product) {
      addToCount(product._id, 1);
      setMessage(`Counted: ${product.name}`);
      setError('');
    } else {
      setError(`No product has the barcode ${code}.`);
      setMessage('');
    }
    scanBoxRef.current?.focus();
  }

  // Removes one product from the count.
  function removeFromCount(productId) {
    setCounts((current) => {
      const copy = { ...current };
      delete copy[productId];
      return copy;
    });
  }

  // Throws away the whole count after confirming.
  function clearCount() {
    if (window.confirm('Clear the whole count and start again?')) {
      setCounts({});
      setMessage('');
    }
  }

  // Sends the counted numbers to the server, which corrects the stock.
  async function saveCount() {
    const entries = Object.entries(counts);
    if (!window.confirm(`Update the stock of ${entries.length} counted product(s) to match your count?`)) return;

    setSaving(true);
    setError('');
    try {
      const data = await api.post('/stock/count', {
        counts: entries.map(([productId, countedQuantity]) => ({ productId, countedQuantity })),
      });
      setMessage(data.message);
      setCounts({});
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const countedRows = products
    .filter((p) => counts[p._id] !== undefined)
    .map((p) => ({ product: p, counted: counts[p._id], difference: counts[p._id] - p.quantity }))
    .filter((row) => !onlyDifferences || row.difference !== 0);

  const differenceCount = products.filter((p) => counts[p._id] !== undefined && counts[p._id] !== p.quantity).length;

  return (
    <div>
      <h1 className="page-title">Stock Count</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card form-grid">
        <div>
          <span className="field-label">Scan an item (each scan adds 1)</span>
          <BarcodeInput
            value={barcode}
            onChange={setBarcode}
            onEnter={handleScan}
            inputRef={scanBoxRef}
            autoFocus
          />
        </div>
        <div className="span-2">
          <span className="field-label">Item has no barcode? Find it here</span>
          <ProductSearch products={products} onSelect={(p) => addToCount(p._id, 1)} />
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <h2>
            Counted items: {Object.keys(counts).length}
            {differenceCount > 0 && <span className="badge badge-orange">{differenceCount} different</span>}
          </h2>
          <label className="checkbox-row">
            <input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />
            Show differences only
          </label>
        </div>

        {loading ? (
          <p className="muted">Loading products...</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="number">System qty</th>
                  <th className="number">Counted</th>
                  <th className="number">Difference</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {countedRows.map(({ product, counted, difference }) => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td className="number">{product.quantity}</td>
                    <td className="number">
                      <div className="qty-control">
                        <button type="button" className="btn btn-small" onClick={() => addToCount(product._id, -1)}>−</button>
                        <input
                          type="number"
                          min="0"
                          value={counted}
                          onChange={(e) => setCount(product._id, e.target.value)}
                        />
                        <button type="button" className="btn btn-small" onClick={() => addToCount(product._id, 1)}>+</button>
                      </div>
                    </td>
                    <td className="number">
                      <span className={difference === 0 ? 'badge badge-green' : 'badge badge-red'}>
                        {difference > 0 ? `+${difference}` : difference}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => removeFromCount(product._id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && countedRows.length === 0 && <p className="muted">Nothing counted yet. Start scanning!</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={saveCount} disabled={saving || Object.keys(counts).length === 0}>
            {saving ? 'Saving...' : 'Update Stock to Match Count'}
          </button>
          <button type="button" className="btn" onClick={clearCount} disabled={Object.keys(counts).length === 0}>
            Clear Count
          </button>
        </div>
        <p className="muted small">
          Only the products you counted are changed. Count a full shelf before saving so the numbers are right.
        </p>
      </div>
    </div>
  );
}

export default StockCountPage;
