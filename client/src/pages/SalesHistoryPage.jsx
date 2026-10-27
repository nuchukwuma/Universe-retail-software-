import { useEffect, useState } from 'react';
import { api } from '../api/api';
import SaleReceiptModal from '../components/receipts/SaleReceiptModal';
import ReturnReceiptModal from '../components/receipts/ReturnReceiptModal';
import ReturnModal from '../components/returns/ReturnModal';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime, todayDateValue } from '../utils/dates';
import { PAYMENT_LABELS } from '../utils/billMath';

const STATUS_LABELS = { completed: '', partly_returned: 'Part returned', returned: 'Returned' };

// Buttons to open each return made against a sale (shown in its receipt box).
function SaleReturnsButtons({ saleId, onOpen }) {
  const [returns, setReturns] = useState([]);

  // Load this sale's returns when the box opens.
  useEffect(() => {
    api.get(`/returns?saleId=${saleId}`).then(setReturns).catch(() => setReturns([]));
  }, [saleId]);

  return returns.map((ret) => (
    <button key={ret._id} type="button" className="btn" onClick={() => onOpen(ret)}>
      ↩️ {ret.returnNumber}
    </button>
  ));
}

// Page for finding past sales by receipt number, customer or date,
// reprinting receipts (marked DUPLICATE COPY) and starting returns.
function SalesHistoryPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(todayDateValue());
  const [to, setTo] = useState(todayDateValue());
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Which pop-up is open: { type: 'receipt' | 'return' | 'returnReceipt', ... } or null
  const [modal, setModal] = useState(null);

  // Search again 300ms after the filters stop changing.
  useEffect(() => {
    const timer = setTimeout(loadSales, 300);
    return () => clearTimeout(timer);
  }, [search, from, to]);

  // Fetches sales matching the filters. A search ignores the dates,
  // so an old receipt number can always be found.
  async function loadSales() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      if (!search.trim()) {
        params.set('from', from);
        params.set('to', to);
      }
      setSales(await api.get(`/sales?${params}`));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Puts an updated sale (e.g. after printing or a return) into the list.
  function replaceSale(updated) {
    setSales((current) => current.map((s) => (s._id === updated._id ? updated : s)));
  }

  const shownTotal = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div>
      <h1 className="page-title">Sales History</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card filter-bar">
        <input
          type="search"
          placeholder="Receipt number or customer (you can scan a receipt)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="date-filter">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={Boolean(search.trim())} />
        </label>
        <label className="date-filter">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={Boolean(search.trim())} />
        </label>
      </div>

      <div className="card">
        <p className="muted small">
          {loading ? 'Loading...' : `${sales.length} sale(s) · ${formatNaira(shownTotal)}`}
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th className="number">Total</th>
                <th>Payment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td>
                    <strong>{sale.receiptNumber}</strong>
                    {STATUS_LABELS[sale.status] && <span className="badge badge-orange">{STATUS_LABELS[sale.status]}</span>}
                  </td>
                  <td>{formatDateTime(sale.createdAt)}</td>
                  <td>{sale.customerName || <span className="muted">Walk-in</span>}</td>
                  <td>{sale.cashierName}</td>
                  <td className="number">{formatNaira(sale.total)}</td>
                  <td>{PAYMENT_LABELS[sale.paymentMethod]}</td>
                  <td>
                    <div className="actions">
                      <button type="button" className="btn btn-small" onClick={() => setModal({ type: 'receipt', sale })}>
                        🧾 View / Print
                      </button>
                      {sale.status !== 'returned' && (
                        <button type="button" className="btn btn-small" onClick={() => setModal({ type: 'return', sale })}>
                          ↩️ Return
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && sales.length === 0 && <p className="muted">No sales found.</p>}
      </div>

      {modal?.type === 'receipt' && (
        <SaleReceiptModal
          sale={modal.sale}
          onPrinted={replaceSale}
          onClose={() => setModal(null)}
          extraButtons={
            modal.sale.refundedTotal > 0 && (
              <SaleReturnsButtons saleId={modal.sale._id} onOpen={(ret) => setModal({ type: 'returnReceipt', ret })} />
            )
          }
        />
      )}
      {modal?.type === 'return' && (
        <ReturnModal
          initialSale={modal.sale}
          onDone={(result) => {
            replaceSale(result.sale);
            setModal({ type: 'returnReceipt', ret: result.return });
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'returnReceipt' && <ReturnReceiptModal ret={modal.ret} onClose={() => setModal(null)} />}
    </div>
  );
}

export default SalesHistoryPage;
