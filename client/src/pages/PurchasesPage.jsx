import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import { formatNaira } from '../utils/formatNaira';
import { formatDate } from '../utils/dates';
import { PURCHASE_STATUS } from '../utils/purchases';

const FILTERS = [
  { key: 'open', label: 'Open', status: 'ordered,part_received' },
  { key: 'received', label: 'Received', status: 'received' },
  { key: 'cancelled', label: 'Cancelled', status: 'cancelled' },
  { key: 'all', label: 'All', status: '' },
];

// Purchase orders: stock ordered from suppliers, and what has arrived.
function PurchasesPage() {
  const [params, setParams] = useSearchParams();
  const filterKey = params.get('show') || 'open';
  const supplierId = params.get('supplier') || '';
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/suppliers').then(setSuppliers).catch(() => {});
  }, []);

  useEffect(() => {
    const filter = FILTERS.find((f) => f.key === filterKey) || FILTERS[0];
    const query = new URLSearchParams();
    if (filter.status) query.set('status', filter.status);
    if (supplierId) query.set('supplier', supplierId);
    setLoading(true);
    api.get(`/purchases?${query}`)
      .then((list) => {
        setOrders(list);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filterKey, supplierId]);

  function setParam(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  }

  return (
    <div className="page">
      <PageHeader title="Purchase orders">
        <Link to="/purchases/new" className="btn btn-primary"><Plus size={18} aria-hidden="true" /> New order</Link>
      </PageHeader>

      <div className="toolbar">
        <div className="choices" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className="choice" aria-pressed={filterKey === f.key} onClick={() => setParam('show', f.key === 'open' ? '' : f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="field">
          <label className="field-label visually-hidden" htmlFor="po-supplier">Supplier</label>
          <select id="po-supplier" value={supplierId} onChange={(e) => setParam('supplier', e.target.value)}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <section className="panel panel-flush" aria-label="Purchase orders">
        {loading && <p className="loading">Loading...</p>}
        {!loading && orders.length === 0 && !error && (
          <div className="empty">
            <p className="strong">No purchase orders</p>
            <div className="btn-row"><Link to="/purchases/new" className="btn">New order</Link></div>
          </div>
        )}
        {!loading && orders.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Supplier</th>
                  <th>Expected</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const status = PURCHASE_STATUS[order.status] || PURCHASE_STATUS.ordered;
                  return (
                    <tr key={order._id}>
                      <td>
                        <Link to={`/purchases/${order._id}`} className="cell-main">{order.purchaseNumber}</Link>
                        <span className="cell-sub">{formatDate(order.createdAt)}</span>
                      </td>
                      <td>{order.supplierName}</td>
                      <td>{order.expectedDate ? formatDate(order.expectedDate) : <span className="muted">-</span>}</td>
                      <td className="num">{order.items.reduce((sum, line) => sum + line.quantity, 0)}</td>
                      <td className="num strong">{formatNaira(order.total)}</td>
                      <td><span className={`status ${status.className}`}>{status.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default PurchasesPage;
