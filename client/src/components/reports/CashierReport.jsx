import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import { formatDate } from '../../utils/dates';

const COLUMNS = [
  { key: 'cashierName', header: 'Cashier', type: 'text', width: 22 },
  { key: 'transactions', header: 'Sales', type: 'number', width: 8 },
  { key: 'itemsSold', header: 'Items', type: 'number', width: 8 },
  { key: 'netSales', header: 'Net sales', type: 'money' },
  { key: 'averageSale', header: 'Average sale', type: 'money' },
  { key: 'discounts', header: 'Discounts given', type: 'money' },
  { key: 'refunds', header: 'Refunds', type: 'money' },
  { key: 'cash', header: 'Cash taken', type: 'money' },
  { key: 'profit', header: 'Profit', type: 'money' },
];

// Sales by cashier: who sold how much in the chosen dates.
function CashierReport({ from, to }) {
  const { data, loading, error } = useReport('/reports/cashiers', from, to);

  if (loading && !data) return <p className="muted">Loading report...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <ReportTable
      title="Sales by cashier"
      subtitle={`${formatDate(from)} to ${formatDate(to)}`}
      fileName={`sales-by-cashier-${from}-to-${to}.xlsx`}
      columns={COLUMNS}
      rows={data.rows.map((row) => ({ ...row, _key: row.cashier }))}
      totals={data.totals}
    />
  );
}

export default CashierReport;
