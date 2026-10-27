import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import SummaryCards from './SummaryCards';
import { formatDate } from '../../utils/dates';
import { formatNaira } from '../../utils/formatNaira';

const COLUMNS = [
  { key: 'day', header: 'Day', type: 'date', width: 14 },
  { key: 'transactions', header: 'Sales', type: 'number', width: 8 },
  { key: 'itemsSold', header: 'Items', type: 'number', width: 8 },
  { key: 'grossSales', header: 'Gross sales', type: 'money' },
  { key: 'discounts', header: 'Discounts', type: 'money' },
  { key: 'netSales', header: 'Net sales', type: 'money' },
  { key: 'refunds', header: 'Refunds', type: 'money' },
  { key: 'cash', header: 'Cash', type: 'money' },
  { key: 'transfer', header: 'Transfer', type: 'money' },
  { key: 'card', header: 'Card', type: 'money' },
  { key: 'profit', header: 'Profit', type: 'money' },
];

// Daily sales report: one row per day in the chosen dates.
function DailySalesReport({ from, to }) {
  const { data, loading, error } = useReport('/reports/daily-sales', from, to);

  if (loading && !data) return <p className="muted">Loading report...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const { totals } = data;
  return (
    <>
      <SummaryCards
        cards={[
          { label: 'Net sales', value: totals.netSales, type: 'money', note: `after ${formatNaira(totals.discounts)} discounts` },
          { label: 'Transactions', value: totals.transactions, type: 'number', note: `${totals.itemsSold} items sold` },
          { label: 'Average sale', value: totals.averageSale, type: 'money' },
          { label: 'Profit', value: totals.profit, type: 'money', tone: totals.profit < 0 ? 'red' : 'green', note: 'after refunds and cost of goods' },
        ]}
      />
      <ReportTable
        title="Daily sales"
        subtitle={`${formatDate(from)} to ${formatDate(to)}`}
        fileName={`daily-sales-${from}-to-${to}.xlsx`}
        columns={COLUMNS}
        rows={data.rows}
        totals={totals}
      />
      <p className="muted small">Refunds are counted on the day of the original sale.</p>
    </>
  );
}

export default DailySalesReport;
