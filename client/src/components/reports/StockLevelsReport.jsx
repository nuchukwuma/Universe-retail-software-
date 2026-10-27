import { useState } from 'react';
import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import SummaryCards from './SummaryCards';
import { formatDate } from '../../utils/dates';

const STATUS_BADGES = { OK: 'badge badge-green', Low: 'badge badge-orange', 'Out of stock': 'badge badge-red' };

const COLUMNS = [
  { key: 'name', header: 'Product', type: 'text', width: 30 },
  { key: 'category', header: 'Category', type: 'text', width: 16 },
  { key: 'quantity', header: 'In stock', type: 'number', width: 10 },
  { key: 'reorderLevel', header: 'Reorder at', type: 'number', width: 10 },
  {
    key: 'status',
    header: 'Status',
    type: 'text',
    width: 13,
    render: (row) => <span className={STATUS_BADGES[row.status]}>{row.status}</span>,
  },
  { key: 'soldInPeriod', header: 'Sold (dates chosen)', type: 'number', width: 12 },
  { key: 'daysLeft', header: 'Days left (approx.)', type: 'number', width: 12 },
  { key: 'costValue', header: 'Stock value (cost)', type: 'money', width: 16 },
  { key: 'retailValue', header: 'Stock value (selling)', type: 'money', width: 16 },
];

// Stock levels report: every product's stock now, its value, and how fast
// it sold in the chosen dates (to plan re-ordering).
function StockLevelsReport({ from, to }) {
  const [status, setStatus] = useState('');
  const { data, loading, error } = useReport('/reports/stock-levels', from, to);

  if (loading && !data) return <p className="muted">Loading report...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const { totals } = data;
  const rows = data.rows
    .filter((row) => !status || row.status === status)
    .map((row) => ({ ...row, _key: row.product }));

  return (
    <>
      <SummaryCards
        cards={[
          { label: 'Stock value (cost)', value: totals.costValue, type: 'money', note: 'what the stock cost you' },
          { label: 'Stock value (selling)', value: totals.retailValue, type: 'money', note: 'if everything sold at full price' },
          { label: 'Low stock', value: totals.lowCount, type: 'number', tone: 'orange' },
          { label: 'Out of stock', value: totals.outCount, type: 'number', tone: 'red' },
        ]}
      />
      <div className="card filter-bar">
        <label className="date-filter">
          Show
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All products</option>
            <option value="Low">Low stock only</option>
            <option value="Out of stock">Out of stock only</option>
            <option value="OK">OK only</option>
          </select>
        </label>
      </div>
      <ReportTable
        title="Stock levels"
        subtitle={`Stock now · sales from ${formatDate(from)} to ${formatDate(to)}`}
        fileName={`stock-levels-${to}.xlsx`}
        columns={COLUMNS}
        rows={rows}
        totals={status ? null : totals}
        emptyText="No products match."
      />
      <p className="muted small">
        "Days left" is how long the stock should last if it keeps selling as fast as in the dates chosen.
      </p>
    </>
  );
}

export default StockLevelsReport;
