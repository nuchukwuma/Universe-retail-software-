import { useState } from 'react';
import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import ReportFigures from './ReportFigures';
import { formatDate } from '../../utils/dates';

const STATUS_CLASS = { 'In stock': 'status status-ok', Low: 'status status-low', 'Out of stock': 'status status-out' };

const COLUMNS = [
  { key: 'name', header: 'Product', type: 'text', width: 30 },
  { key: 'category', header: 'Category', type: 'text', width: 16 },
  { key: 'quantity', header: 'In stock', type: 'number', width: 10 },
  { key: 'reorderLevel', header: 'Low at', type: 'number', width: 9 },
  { key: 'status', header: 'Status', type: 'text', width: 13, render: (row) => <span className={STATUS_CLASS[row.status]}>{row.status}</span> },
  { key: 'soldInPeriod', header: 'Sold in these dates', type: 'number', width: 14 },
  { key: 'daysLeft', header: 'Days of stock left', type: 'number', width: 14 },
  { key: 'stockValue', header: 'Stock value', type: 'money', width: 16 },
];

// Every product's stock now, how fast it sold in the chosen dates, and
// roughly how long it will last (to plan re-ordering).
function StockLevelsReport({ from, to }) {
  const [status, setStatus] = useState('');
  const { data, loading, error } = useReport('/reports/stock-levels', from, to);

  if (loading && !data) return <p className="loading">Loading the report...</p>;
  if (error) return <div className="notice notice-error" role="alert">{error}</div>;

  const { totals } = data;
  const rows = data.rows.filter((row) => !status || row.status === status).map((row) => ({ ...row, _key: row.product }));

  return (
    <>
      <ReportFigures
        figures={[
          { label: 'Stock value', value: totals.stockValue, type: 'money', note: 'everything in stock at its selling price' },
          { label: 'Low stock', value: totals.lowCount, type: 'number', note: 'at or below their low-stock level' },
          { label: 'Out of stock', value: totals.outCount, type: 'number' },
        ]}
      />
      <div className="panel toolbar">
        <div className="field">
          <label className="field-label" htmlFor="stock-show">Show</label>
          <select id="stock-show" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All products</option>
            <option value="Low">Low stock</option>
            <option value="Out of stock">Out of stock</option>
            <option value="In stock">In stock</option>
          </select>
        </div>
      </div>
      <ReportTable
        title="Stock levels"
        subtitle={`Stock now. Sales from ${formatDate(from)} to ${formatDate(to)}. "Days of stock left" assumes it keeps selling at the same speed.`}
        fileName={`stock-levels-${to}.xlsx`}
        columns={COLUMNS}
        rows={rows}
        totals={status ? null : totals}
        emptyText="No products match."
      />
    </>
  );
}

export default StockLevelsReport;
