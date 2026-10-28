import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import ReportFigures from './ReportFigures';
import { formatDate } from '../../utils/dates';

const COLUMNS = [
  { key: 'weekStart', header: 'Week starting (Monday)', type: 'date', width: 20 },
  { key: 'transactions', header: 'Sales', type: 'number', width: 8 },
  { key: 'itemsSold', header: 'Items sold', type: 'number', width: 10 },
  { key: 'netSales', header: 'Sales total', type: 'money' },
  { key: 'refunds', header: 'Refunds', type: 'money' },
  { key: 'takings', header: 'Takings', type: 'money' },
  { key: 'averageSale', header: 'Average sale', type: 'money' },
];

// Weekly sales: one row per week (Monday to Sunday) in the chosen dates.
function WeeklySalesReport({ from, to }) {
  const { data, loading, error } = useReport('/reports/weekly-sales', from, to);

  if (loading && !data) return <p className="loading">Loading the report...</p>;
  if (error) return <div className="notice notice-error" role="alert">{error}</div>;

  const { totals } = data;
  const weeks = data.rows.length;
  return (
    <>
      <ReportFigures
        figures={[
          { label: 'Takings', value: totals.takings, type: 'money', note: `over ${weeks} week${weeks === 1 ? '' : 's'}` },
          { label: 'Average week', value: weeks ? Math.round(totals.takings / weeks) : 0, type: 'money' },
          { label: 'Sales', value: totals.transactions, type: 'number', note: `${totals.itemsSold.toLocaleString('en-NG')} items sold` },
        ]}
      />
      <ReportTable
        title="Weekly sales"
        subtitle={`${formatDate(from)} to ${formatDate(to)}. Weeks run Monday to Sunday; the first and last week may be part weeks.`}
        fileName={`weekly-sales-${from}-to-${to}.xlsx`}
        columns={COLUMNS}
        rows={data.rows.map((row) => ({ ...row, _key: row.weekStart }))}
        totals={data.rows.length ? totals : null}
      />
    </>
  );
}

export default WeeklySalesReport;
