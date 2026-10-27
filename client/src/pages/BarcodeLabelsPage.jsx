import { useEffect, useState } from 'react';
import { api } from '../api/api';
import BarcodeSvg from '../components/BarcodeSvg';
import { STORE_NAME } from '../config';
import { formatNaira } from '../utils/formatNaira';
import '../styles/labels.css';

// Paper choices for labels. "pageCss" sets the printer's paper size.
const LABEL_SIZES = {
  a4: { name: 'A4 sticker sheet (3 × 7 labels)', pageCss: '@page { size: A4; margin: 10mm 7mm; }' },
  roll: { name: 'Label printer roll (50 × 30 mm)', pageCss: '@page { size: 50mm 30mm; margin: 0; }' },
};

// Page for printing barcode stickers, mainly for products that came
// without a barcode (e.g. loose rice, palm oil). It can create an
// in-store barcode for them first.
function BarcodeLabelsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [copies, setCopies] = useState({}); // { productId: numberOfLabels }
  const [labelSize, setLabelSize] = useState('a4');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load the products when the page opens.
  useEffect(() => {
    loadProducts();
  }, []);

  // Fetches all products from the server.
  async function loadProducts() {
    try {
      setProducts(await api.get('/products'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Sets how many labels to print for one product (0 = not selected).
  function setCopiesFor(productId, count) {
    setCopies((current) => ({ ...current, [productId]: Math.max(0, Math.floor(Number(count)) || 0) }));
  }

  const query = search.trim().toLowerCase();
  const shown = products.filter(
    (p) => (!onlyMissing || !p.barcode) && (!query || p.name.toLowerCase().includes(query))
  );
  const selected = products.filter((p) => copies[p._id] > 0);
  const selectedWithoutBarcode = selected.filter((p) => !p.barcode);

  // Builds the list of labels to print: one entry per copy.
  const labels = selected
    .filter((p) => p.barcode)
    .flatMap((p) => Array.from({ length: copies[p._id] }, (_, i) => ({ product: p, key: `${p._id}-${i}` })));

  // Asks the server to create barcodes for selected products that have none.
  async function createBarcodes() {
    setWorking(true);
    setError('');
    try {
      const data = await api.post('/products/generate-barcodes', {
        productIds: selectedWithoutBarcode.map((p) => p._id),
      });
      setMessage(`${data.message} You can now print their labels.`);
      setOnlyMissing(false);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="muted">Loading products...</p>;

  return (
    <div>
      {/* Sets the paper size for this page's printing only */}
      <style>{LABEL_SIZES[labelSize].pageCss}</style>

      <div className="no-print">
        <h1 className="page-title">Barcode Labels</h1>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <div className="card filter-bar">
          <input type="search" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="checkbox-row">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Only products without a barcode
          </label>
        </div>

        <div className="card">
          <div className="table-wrap label-picker">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th className="number">Price</th>
                  <th className="number">Labels</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{p.barcode || <span className="badge badge-orange">None yet</span>}</td>
                    <td className="number">{formatNaira(p.sellingPrice)}</td>
                    <td className="number">
                      <input
                        type="number"
                        min="0"
                        className="copies-input"
                        value={copies[p._id] || 0}
                        onChange={(e) => setCopiesFor(p._id, e.target.value)}
                        aria-label={`Number of labels for ${p.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="muted">No products to show. Untick the box above to see all products.</p>}
          </div>
        </div>

        <div className="card form-grid">
          <label>
            Label paper
            <select value={labelSize} onChange={(e) => setLabelSize(e.target.value)}>
              {Object.entries(LABEL_SIZES).map(([key, size]) => (
                <option key={key} value={key}>{size.name}</option>
              ))}
            </select>
          </label>
          <div className="form-actions span-2">
            {selectedWithoutBarcode.length > 0 && (
              <button type="button" className="btn" onClick={createBarcodes} disabled={working}>
                {working ? 'Creating...' : `Create barcodes for ${selectedWithoutBarcode.length} product(s)`}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={labels.length === 0}>
              🖨️ Print {labels.length} label(s)
            </button>
          </div>
          {selectedWithoutBarcode.length > 0 && (
            <p className="span-full muted small">
              {selectedWithoutBarcode.length} selected product(s) have no barcode yet, so they are not in the preview.
              Create their barcodes first.
            </p>
          )}
        </div>

        <h2>Preview</h2>
        {labels.length === 0 && <p className="muted">Enter a number of labels next to a product to see them here.</p>}
      </div>

      <div className={`print-area label-sheet label-sheet-${labelSize}`}>
        {labels.map(({ product, key }) => (
          <div key={key} className="label">
            <span className="label-store">{STORE_NAME}</span>
            <span className="label-name">{product.name}</span>
            <strong className="label-price">{formatNaira(product.sellingPrice)}</strong>
            <BarcodeSvg value={product.barcode} height={labelSize === 'roll' ? 28 : 34} width={1.4} fontSize={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default BarcodeLabelsPage;
