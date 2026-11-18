import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import ProductSearch from '../components/ProductSearch';
import DateInput from '../components/DateInput';
import { formatNaira } from '../utils/formatNaira';
import { toDateInputValue } from '../utils/dates';

// A new purchase order, or changes to one that has not been received yet.
function PurchaseFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState(params.get('supplier') || '');
  const [lines, setLines] = useState([]); // [{ productId, name, quantity, unitCost }]
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [productList, supplierList, order] = await Promise.all([
          api.get('/products'),
          api.get('/suppliers'),
          isEditing ? api.get(`/purchases/${id}`) : null,
        ]);
        setProducts(productList);
        setSuppliers(supplierList);
        if (order) {
          setSupplierId(String(order.supplier));
          setLines(order.items.map((line) => ({ productId: String(line.product), name: line.name, quantity: line.quantity, unitCost: line.unitCost })));
          setExpectedDate(order.expectedDate ? toDateInputValue(order.expectedDate) : '');
          setNotes(order.notes || '');
          setPurchaseNumber(order.purchaseNumber);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEditing]);

  const total = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0), 0), [lines]);

  // This supplier's products that are at or below their low-stock level.
  const lowFromSupplier = useMemo(
    () => products.filter((p) => p.supplier?._id === supplierId && p.quantity <= (p.reorderLevel || 0) && !lines.some((l) => l.productId === p._id)),
    [products, supplierId, lines],
  );

  function addProduct(product, quantity = 1) {
    setLines((current) => {
      if (current.some((line) => line.productId === product._id)) {
        return current.map((line) => (line.productId === product._id ? { ...line, quantity: Number(line.quantity) + quantity } : line));
      }
      return [...current, { productId: product._id, name: product.name, quantity, unitCost: product.costPrice || 0 }];
    });
  }

  function addLowStock() {
    lowFromSupplier.forEach((p) => addProduct(p, Math.max(1, (p.reorderLevel || 1) * 2 - Math.max(p.quantity, 0))));
  }

  function setLine(productId, field, value) {
    setLines((current) => current.map((line) => (line.productId === productId ? { ...line, [field]: value } : line)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      supplierId,
      items: lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitCost: Number(line.unitCost) || 0 })),
      expectedDate: expectedDate || null,
      notes,
    };
    try {
      const order = isEditing ? await api.put(`/purchases/${id}`, body) : await api.post('/purchases', body);
      navigate(`/purchases/${order._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <form className="page" onSubmit={handleSubmit}>
      <PageHeader title={isEditing ? `Edit ${purchaseNumber}` : 'New purchase order'}>
        <Link to={isEditing ? `/purchases/${id}` : '/purchases'} className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving || lines.length === 0 || !supplierId}>
          {saving ? 'Saving...' : isEditing ? 'Save order' : 'Create order'}
        </button>
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <section className="panel form-grid">
        <div className="field">
          <label className="field-label" htmlFor="po-supplier">Supplier</label>
          <select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">Choose a supplier</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          {suppliers.length === 0 && <Link to="/suppliers" className="small">Add a supplier</Link>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="po-expected">Expected on</label>
          <DateInput id="po-expected" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </div>
        <div className="field span-all">
          <label className="field-label" htmlFor="po-notes">Notes</label>
          <input id="po-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      <section className="panel panel-flush" aria-labelledby="po-lines-heading">
        <div className="panel-head">
          <h2 id="po-lines-heading">Items</h2>
          {lowFromSupplier.length > 0 && (
            <button type="button" className="btn btn-small" onClick={addLowStock}>
              Add {lowFromSupplier.length} low-stock {lowFromSupplier.length === 1 ? 'item' : 'items'}
            </button>
          )}
        </div>
        <div className="panel-foot">
          <label className="field-label" htmlFor="po-add">Add a product</label>
          <ProductSearch id="po-add" products={products} onSelect={(p) => addProduct(p)} />
        </div>
        {lines.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Quantity</th>
                  <th className="num">Cost each</th>
                  <th className="num">Line total</th>
                  <th><span className="visually-hidden">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.productId}>
                    <td className="cell-main">{line.name}</td>
                    <td className="num">
                      <input
                        className="input-number"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => setLine(line.productId, 'quantity', e.target.value)}
                        aria-label={`Quantity of ${line.name}`}
                        required
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input-number"
                        type="number"
                        min="0"
                        step="any"
                        value={line.unitCost}
                        onChange={(e) => setLine(line.productId, 'unitCost', e.target.value)}
                        aria-label={`Cost of one ${line.name}`}
                        required
                      />
                    </td>
                    <td className="num strong">{formatNaira((Number(line.quantity) || 0) * (Number(line.unitCost) || 0))}</td>
                    <td className="actions">
                      <button type="button" className="icon-btn icon-btn-danger" onClick={() => setLines(lines.filter((l) => l.productId !== line.productId))} aria-label={`Remove ${line.name}`}>
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3">Total</td>
                  <td className="num">{formatNaira(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </form>
  );
}

export default PurchaseFormPage;
