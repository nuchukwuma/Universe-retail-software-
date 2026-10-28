import { useEffect, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import ScannerStatus from '../components/ScannerStatus';
import SaleReceiptModal from '../components/receipts/SaleReceiptModal';
import ReturnReceiptModal from '../components/receipts/ReturnReceiptModal';
import ReturnModal from '../components/returns/ReturnModal';
import { useGlobalScanner } from '../hooks/useScanner';
import { formatNaira } from '../utils/formatNaira';
import { formatDateTime, todayDateValue } from '../utils/dates';
import DateInput from '../components/DateInput';

const STATUS_LABELS = { completed: '', partly_returned: 'Part returned', returned: 'Returned' };

// Buttons to open each return made against a sale (in its receipt dialog).
function SaleReturnsButtons({ saleId, onOpen }) {
  const [returns, setReturns] = useState([]);

  // Load this sale's returns when the dialog opens.
  useEffect(() => {
    api.get(`/returns?saleId=${saleId}`).then(setReturns).catch(() => setReturns([]));
  }, [saleId]);

  return returns.map((ret) => (
    <button key={ret._id} type="button" className="btn" onClick={() => onOpen(ret)}>
      Return slip {ret.returnNumber}
    </button>
  ));
}

// Find past sales by receipt number, customer or date, print a copy of a
// receipt (marked DUPLICATE COPY) and start a return.
function SalesHistoryPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState(todayDateValue());
  const [to, setTo] = useState(todayDateValue());
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Which dialog is open: { type: 'receipt' | 'return' | 'returnReceipt', ... } or null
  const [modal, setModal] = useState(null);

  // Search again 300ms after the filters stop changing.
  useEffect(() => {
    const timer = setTimeout(loadSales, 300);
    return () => clearTimeout(timer);
  }, [search, from, to]);

  // Scanning a receipt's barcode looks that receipt up.
  useGlobalScanner(setSearch, modal === null);

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

  // Puts an updated sale (after printing or a return) into the list.
  function replaceSale(updated) {
    setSales((current) => current.map((s) => (s._id === updated._id ? updated : s)));
  }

  const shownTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const searching = Boolean(search.trim());

  return (
    <div className="page">
      <PageHeader title="Sales history" lead="Find a sale to print a copy of its receipt or to return items." />

      <ScannerStatus readyText="Scanner ready: scan the barcode on a receipt to find that sale." paused={modal !== null} pausedText="Scanner paused while a window is open." />
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="panel toolbar">
        <div className="field">
          <label className="field-label" htmlFor="history-search">Receipt number or customer</label>
          <input id="history-search" type="search" placeholder="e.g. 261027-0004 or Ada" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="history-from">From</label>
          <DateInput id="history-from" value={from} onChange={(e) => setFrom(e.target.value)} disabled={searching} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="history-to">To</label>
          <DateInput id="history-to" value={to} onChange={(e) => setTo(e.target.value)} disabled={searching} />
        </div>
      </div>
      {searching && <p className="muted small">Searching every date. Clear the search to filter by date again.</p>}

      <section className="panel panel-flush" aria-label="Sales">
        <div className="panel-head">
          <p>{loading ? 'Loading sales...' : `${sales.length} sale${sales.length === 1 ? '' : 's'}, ${formatNaira(shownTotal)} in total`}</p>
        </div>
        {!loading && sales.length === 0 && (
          <p className="empty muted">{searching ? `No sale matches "${search}".` : 'No sales on these dates.'}</p>
        )}
        {sales.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale._id}>
                    <td>
                      <span className="cell-main">{sale.receiptNumber}</span>
                      {STATUS_LABELS[sale.status] && <span className="cell-sub status status-low">{STATUS_LABELS[sale.status]}</span>}
                    </td>
                    <td>{formatDateTime(sale.createdAt)}</td>
                    <td>{sale.customerName || <span className="muted">Walk-in</span>}</td>
                    <td>{sale.cashierName}</td>
                    <td className="num">{sale.items.reduce((n, item) => n + item.quantity, 0)}</td>
                    <td className="num strong">{formatNaira(sale.total)}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-quiet" onClick={() => setModal({ type: 'receipt', sale })}>
                        Receipt<span className="visually-hidden"> {sale.receiptNumber}</span>
                      </button>
                      {sale.status !== 'returned' && (
                        <button type="button" className="btn btn-quiet" onClick={() => setModal({ type: 'return', sale })}>
                          Return<span className="visually-hidden"> items from {sale.receiptNumber}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
