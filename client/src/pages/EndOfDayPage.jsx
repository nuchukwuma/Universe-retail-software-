import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import DateInput from '../components/DateInput';
import { formatNaira } from '../utils/formatNaira';
import { todayDateValue } from '../utils/dates';
import { canUseBackOffice } from '../utils/roles';

// The day's totals for one cashier (or everyone).
// Cashiers see their own sales only.
function EndOfDayPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayDateValue());
  const [cashier, setCashier] = useState(canUseBackOffice(user) ? 'all' : user._id);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="page">
      <PageHeader title="End of day" lead="The day's sales, refunds and takings." />
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
        <>
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

          <section className="panel panel-flush" aria-labelledby="eod-heading">
            <div className="panel-head"><h2 id="eod-heading">{report.cashierName}</h2></div>
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
            <div className="panel-foot">
              {report.salesCount === 0
                ? <p className="muted">No sales on this day{cashier !== 'all' ? ' for this cashier' : ''}.</p>
                : <p className="muted small">Receipts {report.firstReceipt} to {report.lastReceipt}.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default EndOfDayPage;
