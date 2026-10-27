import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePrinter } from '../context/PrintContext';
import EndOfDayReceipt from '../components/receipts/EndOfDayReceipt';
import { downloadReceiptPdf } from '../components/receipts/receiptActions';
import { formatNaira } from '../utils/formatNaira';
import { todayDateValue } from '../utils/dates';
import { PAYMENT_LABELS } from '../utils/billMath';
import { canUseBackOffice } from '../utils/roles';

// End-of-day page: totals by payment method so the cashier can count the
// till and see if it balances. Cashiers see their own sales only.
function EndOfDayPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { printDocument } = usePrinter();
  const [date, setDate] = useState(todayDateValue());
  const [cashier, setCashier] = useState(canUseBackOffice(user) ? 'all' : user._id);
  const [countedCash, setCountedCash] = useState('');
  const [paper, setPaper] = useState(settings.paperSize);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const slipRef = useRef(null);

  // Load the report whenever the date or cashier changes.
  useEffect(() => {
    async function loadReport() {
      try {
        setReport(await api.get(`/reports/end-of-day?date=${date}&cashier=${cashier}`));
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
    loadReport();
  }, [date, cashier]);

  // Keep the paper choice in step with Settings once they load.
  useEffect(() => {
    setPaper(settings.paperSize);
  }, [settings.paperSize]);

  const slip = report && <EndOfDayReceipt report={report} settings={settings} paper={paper} countedCash={countedCash} />;
  const difference = countedCash === '' || !report ? null : Number(countedCash) - report.expectedCash;

  return (
    <div>
      <h1 className="page-title">End of Day</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card filter-bar">
        <label className="date-filter">
          Day
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {canUseBackOffice(user) && (
          <label className="date-filter">
            Cashier
            <select value={cashier} onChange={(e) => setCashier(e.target.value)}>
              <option value="all">All cashiers</option>
              {report?.cashiers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="date-filter">
          Cash counted in till (₦)
          <input type="number" min="0" step="any" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} placeholder="Count the cash" />
        </label>
      </div>

      {report && (
        <div className="eod-layout">
          <div>
            <div className="stat-cards">
              <div className="stat-card">
                <span>Sales</span>
                <strong>{report.salesCount}</strong>
                <small>{report.itemsSold} items sold</small>
              </div>
              <div className="stat-card">
                <span>Net sales</span>
                <strong>{formatNaira(report.netSales)}</strong>
                <small>after {formatNaira(report.discounts)} discounts</small>
              </div>
              <div className="stat-card stat-card-red">
                <span>Refunds</span>
                <strong>{formatNaira(report.refunds)}</strong>
                <small>{report.returnsCount} return(s)</small>
              </div>
            </div>

            <div className="card">
              <h2>By payment method</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th className="number">Sales</th>
                    <th className="number">Refunds</th>
                    <th className="number">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {['cash', 'transfer', 'card'].map((m) => (
                    <tr key={m}>
                      <td>{PAYMENT_LABELS[m]}</td>
                      <td className="number">{formatNaira(report.salesByMethod[m])}</td>
                      <td className="number">
                        {report.refundsByMethod[m] > 0 ? `-${formatNaira(report.refundsByMethod[m])}` : formatNaira(0)}
                      </td>
                      <td className="number"><strong>{formatNaira(report.netByMethod[m])}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`card till-check ${difference === null ? '' : difference === 0 ? 'till-ok' : 'till-off'}`}>
              <div>Cash that should be in the till: <strong>{formatNaira(report.expectedCash)}</strong></div>
              {difference === null && <div className="muted small">Enter the cash you counted above to check the till.</div>}
              {difference === 0 && <div>✅ The till balances.</div>}
              {difference !== null && difference !== 0 && (
                <div>⚠️ The till is <strong>{difference > 0 ? 'OVER' : 'SHORT'}</strong> by {formatNaira(Math.abs(difference))}.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="page-header">
              <h2>Printable summary</h2>
              <select value={paper} onChange={(e) => setPaper(e.target.value)} aria-label="Paper size">
                <option value="58mm">58mm receipt</option>
                <option value="80mm">80mm receipt</option>
                <option value="A4">A4 page</option>
              </select>
            </div>
            <div className="receipt-preview">
              <div ref={slipRef} className="receipt-preview-paper">{slip}</div>
            </div>
            <div className="receipt-buttons">
              <button type="button" className="btn btn-primary" onClick={() => printDocument(slip, paper)}>🖨️ Print</button>
              <button
                type="button"
                className="btn"
                onClick={() => downloadReceiptPdf(slipRef.current, `end-of-day-${report.date}.pdf`, paper)}
              >
                ⬇️ Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EndOfDayPage;
