import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import ReportFigures from './ReportFigures';
import { formatDate } from '../../utils/dates';
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
          { label: 'Takings', value: totals.takings, type: 'money', note: 'sales total minus refunds' },
          { label: 'Sales', value: totals.transactions, type: 'number', note: `${totals.itemsSold.toLocaleString('en-NG')} items sold` },
          { label: 'Average sale', value: totals.averageSale, type: 'money' },
          { label: 'Discounts given', value: totals.discounts, type: 'money', note: totals.grossSales ? `on ${formatNaira(totals.grossSales)} of sales` : undefined },
        ]}
      />
      <ReportTable
        title="Daily sales"
        subtitle={`${formatDate(from)} to ${formatDate(to)}. Refunds are counted on the day of the original sale.`}
        fileName={`daily-sales-${from}-to-${to}.xlsx`}
        columns={COLUMNS}
        rows={data.rows}
        totals={data.rows.length ? totals : null}
      />
    </>
  );
}

export default DailySalesReport;
