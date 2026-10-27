import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import SummaryCards from './SummaryCards';
import { formatDate } from '../../utils/dates';

const CATEGORY_COLUMNS = [
  { key: 'category', header: 'Category', type: 'text', width: 20 },
  { key: 'quantity', header: 'Qty sold', type: 'number', width: 10 },
  { key: 'revenue', header: 'Revenue', type: 'money' },
  { key: 'cost', header: 'Cost of goods', type: 'money' },
  { key: 'profit', header: 'Profit', type: 'money' },
  { key: 'margin', header: 'Margin', type: 'percent', width: 9 },
];

const PRODUCT_COLUMNS = [
  { key: 'name', header: 'Product', type: 'text', width: 30 },
  { key: 'category', header: 'Category', type: 'text', width: 16 },
  { key: 'quantity', header: 'Qty sold', type: 'number', width: 10 },
  { key: 'revenue', header: 'Revenue', type: 'money' },
  { key: 'profit', header: 'Profit', type: 'money' },
  { key: 'margin', header: 'Margin', type: 'percent', width: 9 },
];

// Profit report: money made after the cost of the goods, by category,
// plus the ten products that made the most profit.
function ProfitReport({ from, to }) {
  const { data, loading, error } = useReport('/reports/profit', from, to);

  if (loading && !data) return <p className="muted">Loading report...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const { totals } = data;
  const dates = `${formatDate(from)} to ${formatDate(to)}`;
  return (
    <>
      <SummaryCards
        cards={[
          { label: 'Revenue', value: totals.revenue, type: 'money', note: 'what customers paid, after discounts and refunds' },
          { label: 'Cost of goods', value: totals.cost, type: 'money', note: 'cost price of the items sold' },
          { label: 'Profit', value: totals.profit, type: 'money', tone: totals.profit < 0 ? 'red' : 'green' },
          { label: 'Margin', value: totals.margin, type: 'percent', note: 'profit as a % of revenue' },
        ]}
      />
      <ReportTable
        title="Profit by category"
        subtitle={dates}
        fileName={`profit-by-category-${from}-to-${to}.xlsx`}
        columns={CATEGORY_COLUMNS}
        rows={data.rows.map((row) => ({ ...row, _key: row.category }))}
        totals={totals}
      />
      <ReportTable
        title="Top 10 most profitable products"
        subtitle={dates}
        fileName={`top-profit-products-${from}-to-${to}.xlsx`}
        columns={PRODUCT_COLUMNS}
        rows={data.topProducts.map((row) => ({ ...row, _key: row.product }))}
      />
      <p className="muted small">
        Profit uses each product's cost price at the moment it was sold. Keep cost prices up to date (Receive Stock
        updates them) for accurate profit.
      </p>
    </>
  );
}

export default ProfitReport;
