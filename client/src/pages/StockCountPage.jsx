import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import BarcodeInput from '../components/BarcodeInput';
import ProductSearch from '../components/ProductSearch';
import ScannerStatus from '../components/ScannerStatus';
import { useGlobalScanner } from '../hooks/useScanner';

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

// Count what is really on the shelves. Every scan adds 1 to that
// product's count; then compare with the stock the system has.
function StockCountPage() {
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState(loadSavedCount); // { productId: numberCounted }
  const [barcode, setBarcode] = useState('');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [lastCountedId, setLastCountedId] = useState(null);
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
    setLastCountedId(productId);
  }

  // Sets the counted number for one product (typed in by hand).
  function setCount(productId, value) {
    setCounts((current) => ({ ...current, [productId]: Math.max(0, Math.floor(Number(value)) || 0) }));
  }

  // Every scan: find the product and add 1 to its count.
  function handleScan(code) {
    setBarcode('');
    const product = products.find((p) => p.barcode === code);
    if (product) {
      addToCount(product._id, 1);
      setMessage(`Counted ${product.name}: ${(counts[product._id] || 0) + 1}`);
      setError('');
    } else {
      setError(`Product not found: no product has the barcode ${code}.`);
      setMessage('');
    }
    scanBoxRef.current?.focus();
  }
  useGlobalScanner(handleScan, !loading);

  // Takes one product out of the count.
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
    if (!window.confirm(`Set the stock of ${entries.length} counted product(s) to your count?`)) return;
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
  const countedTotal = Object.keys(counts).length;
  const differenceCount = products.filter((p) => counts[p._id] !== undefined && counts[p._id] !== p.quantity).length;

  return (
    <div className="page">
      <PageHeader title="Stock count" lead="Scan every item on a shelf. Each scan adds 1. Then set the stock to what you counted." />

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="panel form-grid">
        <div className="field">
          <label className="field-label" htmlFor="count-barcode">Scan an item</label>
          <BarcodeInput id="count-barcode" value={barcode} onChange={setBarcode} onEnter={handleScan} inputRef={scanBoxRef} autoFocus />
          <ScannerStatus readyText="Scanner ready: each scan adds 1 to the count." />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="count-search">No barcode? Find it by name</label>
          <ProductSearch id="count-search" products={products} onSelect={(p) => addToCount(p._id, 1)} />
        </div>
      </div>

      <section className="panel panel-flush" aria-label="Counted items">
        <div className="panel-head">
          <h2>{countedTotal} product{countedTotal === 1 ? '' : 's'} counted{differenceCount > 0 ? `, ${differenceCount} different from the system` : ''}</h2>
          <label className="check">
            <input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />
            Show differences only
          </label>
        </div>

        {loading && <p className="loading">Loading products...</p>}
        {!loading && countedRows.length === 0 && (
          <p className="empty muted">{countedTotal === 0 ? 'Nothing counted yet. Scan the first item.' : 'Every counted product matches the system.'}</p>
        )}
        {countedRows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">System</th>
                  <th className="num">Counted</th>
                  <th className="num">Difference</th>
                  <th><span className="visually-hidden">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {countedRows.map(({ product, counted, difference }) => (
                  <tr key={product._id} className={product._id === lastCountedId ? 'is-highlighted' : undefined}>
                    <td className="cell-main">{product.name}</td>
                    <td className="num">{product.quantity}</td>
                    <td className="num">
                      <div className="qty">
                        <button type="button" className="btn" onClick={() => addToCount(product._id, -1)} aria-label={`One less ${product.name}`}>-</button>
                        <input type="number" min="0" value={counted} onChange={(e) => setCount(product._id, e.target.value)} aria-label={`Counted ${product.name}`} />
                        <button type="button" className="btn" onClick={() => addToCount(product._id, 1)} aria-label={`One more ${product.name}`}>+</button>
                      </div>
                    </td>
                    <td className={difference === 0 ? 'num status status-ok' : 'num status status-bad'}>
                      {difference === 0 ? 'Matches' : difference > 0 ? `${difference} more` : `${-difference} fewer`}
                    </td>
                    <td className="actions">
                      <button type="button" className="btn btn-quiet btn-danger" onClick={() => removeFromCount(product._id)}>
                        Remove<span className="visually-hidden"> {product.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel-foot btn-row">
          <button type="button" className="btn btn-primary" onClick={saveCount} disabled={saving || countedTotal === 0}>
            {saving ? 'Saving...' : 'Set stock to my count'}
          </button>
          <button type="button" className="btn" onClick={clearCount} disabled={countedTotal === 0}>Clear the count</button>
          <span className="muted small">Only the products you counted are changed.</span>
        </div>
      </section>
    </div>
  );
}

export default StockCountPage;
