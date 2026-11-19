import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import ReportFigures from './ReportFigures';
import { formatDate } from '../../utils/dates';
import { Link } from 'react-router-dom';
import { formatNaira } from '../../utils/formatNaira';

const COLUMNS = [
  { key: 'day', header: 'Day', type: 'date', width: 14 },
  { key: 'transactions', header: 'Sales', type: 'number', width: 8 },
  { key: 'itemsSold', header: 'Items sold', type: 'number', width: 10 },
  { key: 'grossSales', header: 'Before discount', type: 'money' },
  { key: 'discounts', header: 'Discounts', type: 'money' },
  { key: 'netSales', header: 'Sales total', type: 'money' },
  { key: 'refunds', header: 'Refunds', type: 'money' },
  { key: 'takings', header: 'Takings', type: 'money' },
  { key: 'costOfGoods', header: 'Cost of goods', type: 'money' },
  { key: 'profit', header: 'Profit', type: 'money' },
];

// Daily sales: one row per day in the chosen dates.
function DailySalesReport({ from, to }) {
  const { data, loading, error } = useReport('/reports/daily-sales', from, to);

  if (loading && !data) return <p className="loading">Loading the report...</p>;
  if (error) return <div className="notice notice-error" role="alert">{error}</div>;

  const { totals } = data;
  return (
    <>
      <ReportFigures
        figures={[
          { label: 'Takings', value: totals.takings, type: 'money' },
          { label: 'Profit', value: totals.profit, type: 'money', note: totals.takings - totals.uncostedSales > 0 ? `${Math.round((totals.profit / (totals.takings - totals.uncostedSales)) * 100)}% margin` : undefined },
          { label: 'Sales', value: totals.transactions, type: 'number', note: `${totals.itemsSold.toLocaleString('en-NG')} items, average ${formatNaira(totals.averageSale)}` },
          { label: 'Discounts given', value: totals.discounts, type: 'money' },
        ]}
      />
      {totals.itemsWithoutCost > 0 && (
        <div className="notice notice-warning">
          <span className="notice-title">{totals.itemsWithoutCost} {totals.itemsWithoutCost === 1 ? 'item' : 'items'} sold without a cost price</span>
          They are left out of profit ({formatNaira(totals.uncostedSales)} of sales).
          <div className="btn-row"><Link to="/products" className="btn btn-small">Products</Link></div>
        </div>
      )}
      <ReportTable
        title="Daily sales"
        subtitle={`${formatDate(from)} to ${formatDate(to)}`}
        fileName={`daily-sales-${from}-to-${to}.xlsx`}
        columns={COLUMNS}
        rows={data.rows}
        totals={data.rows.length ? totals : null}
      />
    </>
  );
}

export default DailySalesReport;
