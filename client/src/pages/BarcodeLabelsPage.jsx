import { useEffect, useState } from 'react';
import { api } from '../api/api';
import BarcodeSvg from '../components/BarcodeSvg';
import PageHeader from '../components/PageHeader';
import { useSettings } from '../context/SettingsContext';
import { formatNaira } from '../utils/formatNaira';
import '../styles/labels.css';

// Paper choices for labels. "pageCss" sets the printer's paper size.
const LABEL_SIZES = {
  a4: { name: 'A4 sticker sheet, 21 labels (3 across, 7 down)', pageCss: '@page { size: A4; margin: 10mm 7mm; }' },
  roll: { name: 'Label printer roll, 50 by 30 mm', pageCss: '@page { size: 50mm 30mm; margin: 0; }' },
};

// Page for printing barcode stickers, mainly for products that came
// without a barcode (e.g. loose rice, palm oil). It can create an
// in-store barcode for them first.
function BarcodeLabelsPage() {
  const { settings } = useSettings();
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

  if (loading) return <p className="loading">Loading products...</p>;

  return (
    <div className="page">
      {/* Sets the paper size for this page's printing only */}
      <style>{LABEL_SIZES[labelSize].pageCss}</style>

      <div className="no-print stack">
        <PageHeader title="Barcode labels" lead="Print price stickers with a barcode, mainly for products that came without one (loose rice, palm oil)." />
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {message && <div className="notice notice-success" role="status">{message}</div>}

        <div className="panel toolbar">
          <div className="field">
            <label className="field-label" htmlFor="labels-search">Search</label>
            <input id="labels-search" type="search" placeholder="Product name" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className="check">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Only products without a barcode
          </label>
        </div>

        <section className="panel panel-flush" aria-label="Choose labels">
          {shown.length === 0 ? (
            <p className="empty muted">No products to show. Untick "Only products without a barcode" to see every product.</p>
          ) : (
            <div className="table-wrap label-picker">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Barcode</th>
                    <th className="num">Price</th>
                    <th className="num">Labels to print</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p._id} className={copies[p._id] > 0 ? 'is-highlighted' : undefined}>
                      <td className="cell-main">{p.name}</td>
                      <td>{p.barcode || <span className="status status-low">None yet</span>}</td>
                      <td className="num">{formatNaira(p.sellingPrice)}</td>
                      <td className="num">
                        <input
                          type="number"
                          min="0"
                          className="input-number"
                          value={copies[p._id] || 0}
                          onChange={(e) => setCopiesFor(p._id, e.target.value)}
                          aria-label={`Number of labels for ${p.name}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="panel toolbar">
          <div className="field">
            <label className="field-label" htmlFor="labels-paper">Label paper</label>
            <select id="labels-paper" value={labelSize} onChange={(e) => setLabelSize(e.target.value)}>
              {Object.entries(LABEL_SIZES).map(([key, size]) => (
                <option key={key} value={key}>{size.name}</option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            {selectedWithoutBarcode.length > 0 && (
              <button type="button" className="btn" onClick={createBarcodes} disabled={working}>
                {working ? 'Creating...' : `Create barcodes for ${selectedWithoutBarcode.length} product(s)`}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={labels.length === 0}>
              Print {labels.length} label{labels.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
        {selectedWithoutBarcode.length > 0 && (
          <p className="warning-text">
            {selectedWithoutBarcode.length} chosen product(s) have no barcode yet, so they are not in the preview. Create their barcodes first.
          </p>
        )}

        <h2>Preview</h2>
        {labels.length === 0 && <p className="muted">Enter a number of labels next to a product to see them here.</p>}
      </div>

      <div className={`label-sheet label-sheet-${labelSize}`}>
        {labels.map(({ product, key }) => (
          <div key={key} className="label">
            <span className="label-store">{settings.storeName}</span>
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
