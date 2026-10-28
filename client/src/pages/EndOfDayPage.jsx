import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { usePrinter } from '../context/PrintContext';
import PageHeader from '../components/PageHeader';
import EndOfDayReceipt from '../components/receipts/EndOfDayReceipt';
import { downloadReceiptPdf } from '../components/receipts/receiptActions';
import { formatNaira } from '../utils/formatNaira';
import { todayDateValue } from '../utils/dates';
import { canUseBackOffice } from '../utils/roles';
import DateInput from '../components/DateInput';

// The day's totals for one cashier (or everyone), with a slip to print
// and sign at closing time. Cashiers see their own sales only.
function EndOfDayPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { printDocument } = usePrinter();
  const [date, setDate] = useState(todayDateValue());
  const [cashier, setCashier] = useState(canUseBackOffice(user) ? 'all' : user._id);
  const [paper, setPaper] = useState(settings.paperSize);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const slipRef = useRef(null);

  // Load the report whenever the date or cashier changes.
  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        setReport(await api.get(`/reports/end-of-day?date=${date}&cashier=${cashier}`));
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [date, cashier]);

  // Keep the paper choice in step with Settings once they load.
  useEffect(() => {
    setPaper(settings.paperSize);
  }, [settings.paperSize]);

  const slip = report && <EndOfDayReceipt report={report} settings={settings} paper={paper} />;

  return (
    <div className="page">
      <PageHeader title="End of day" lead="The day's sales and refunds. Print the slip at closing time for the cashier and a manager to sign." />
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="panel toolbar">
        <div className="field">
          <label className="field-label" htmlFor="eod-date">Day</label>
          <DateInput id="eod-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {canUseBackOffice(user) && (
          <div className="field">
            <label className="field-label" htmlFor="eod-cashier">Cashier</label>
            <select id="eod-cashier" value={cashier} onChange={(e) => setCashier(e.target.value)}>
              <option value="all">All cashiers</option>
              {report?.cashiers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading && !report && <p className="loading">Loading the day's totals...</p>}

      {report && (
        <div className="columns">
          <section className="panel" aria-label="Totals">
            <div className="panel-head"><h2>{report.cashierName}</h2></div>
            <dl className="figures">
              <div className="figure">
                <dt>Takings</dt>
                <dd>{formatNaira(report.takings)}<span className="figure-note muted">sales minus refunds</span></dd>
              </div>
              <div className="figure">
                <dt>Sales</dt>
                <dd>{report.salesCount}<span className="figure-note muted">{report.itemsSold} items sold</span></dd>
              </div>
              <div className="figure">
                <dt>Refunds</dt>
                <dd>{formatNaira(report.refunds)}<span className="figure-note muted">{report.returnsCount} return{report.returnsCount === 1 ? '' : 's'}</span></dd>
              </div>
            </dl>
            <table className="table">
              <tbody>
                <tr><td>Sales before discount</td><td className="num">{formatNaira(report.grossSales)}</td></tr>
                <tr><td>Discounts given</td><td className="num">{report.discounts > 0 ? `minus ${formatNaira(report.discounts)}` : formatNaira(0)}</td></tr>
                <tr><td>Sales</td><td className="num">{formatNaira(report.netSales)}</td></tr>
                <tr><td>Refunds</td><td className="num">{report.refunds > 0 ? `minus ${formatNaira(report.refunds)}` : formatNaira(0)}</td></tr>
              </tbody>
              <tfoot>
                <tr><td>Takings</td><td className="num">{formatNaira(report.takings)}</td></tr>
              </tfoot>
            </table>
            {report.salesCount === 0 && <p className="muted">No sales on this day{cashier !== 'all' ? ' for this cashier' : ''}.</p>}
            {report.firstReceipt && <p className="muted small">Receipts {report.firstReceipt} to {report.lastReceipt}.</p>}
          </section>

          <section className="panel stack" aria-label="Slip to print">
            <div className="panel-head">
              <h2>Slip to print</h2>
              <select value={paper} onChange={(e) => setPaper(e.target.value)} aria-label="Paper size" className="input-auto">
                <option value="58mm">58mm receipt</option>
                <option value="80mm">80mm receipt</option>
                <option value="A4">A4 page</option>
              </select>
            </div>
            <div className="receipt-preview">
              <div ref={slipRef} className="receipt-preview-paper">{slip}</div>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => printDocument(slip, paper)}>Print slip</button>
              <button type="button" className="btn" onClick={() => downloadReceiptPdf(slipRef.current, `end-of-day-${report.date}.pdf`, paper)}>
                Save as PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default EndOfDayPage;
