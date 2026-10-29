import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import { formatDate } from '../../utils/dates';

const COLUMNS = [
  { key: 'cashierName', header: 'Cashier', type: 'text', width: 22 },
  { key: 'transactions', header: 'Sales', type: 'number', width: 8 },
  { key: 'itemsSold', header: 'Items sold', type: 'number', width: 10 },
  { key: 'netSales', header: 'Sales total', type: 'money' },
  { key: 'averageSale', header: 'Average sale', type: 'money' },
  { key: 'discounts', header: 'Discounts given', type: 'money' },
  { key: 'refunds', header: 'Refunds', type: 'money' },
  { key: 'takings', header: 'Takings', type: 'money' },
];

// Sales by cashier: who sold how much in the chosen dates.
function CashierReport({ from, to }) {
  const { data, loading, error } = useReport('/reports/cashiers', from, to);

  if (loading && !data) return <p className="loading">Loading the report...</p>;
  if (error) return <div className="notice notice-error" role="alert">{error}</div>;

  return (
    <ReportTable
      title="Sales by cashier"
      subtitle={`${formatDate(from)} to ${formatDate(to)}`}
      fileName={`sales-by-cashier-${from}-to-${to}.xlsx`}
      columns={COLUMNS}
      rows={data.rows.map((row) => ({ ...row, _key: row.cashier }))}
      totals={data.rows.length ? data.totals : null}
    />
  );
}

export default CashierReport;
