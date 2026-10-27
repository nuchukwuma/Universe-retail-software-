import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import { formatDate } from '../../utils/dates';

const COLUMNS = [
  { key: 'rank', header: '#', type: 'number', width: 5 },
  { key: 'name', header: 'Product', type: 'text', width: 30 },
  { key: 'category', header: 'Category', type: 'text', width: 16 },
  { key: 'quantity', header: 'Qty sold', type: 'number', width: 10 },
  { key: 'revenue', header: 'Revenue', type: 'money' },
  { key: 'profit', header: 'Profit', type: 'money' },
  { key: 'margin', header: 'Margin', type: 'percent', width: 9 },
];

// Best-selling products, most sold first. Can be narrowed to one category.
function BestSellersReport({ from, to }) {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const { data, loading, error } = useReport('/reports/best-sellers', from, to, category ? { category } : {});

  // Load the categories for the filter.
  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  const categoryName = categories.find((c) => c._id === category)?.name;

  return (
    <>
      <div className="card filter-bar">
        <label className="date-filter">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>
        </label>
      </div>
      {loading && !data && <p className="muted">Loading report...</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {data && (
        <ReportTable
          title={categoryName ? `Best-selling products: ${categoryName}` : 'Best-selling products'}
          subtitle={`${formatDate(from)} to ${formatDate(to)}`}
          fileName={`best-sellers-${from}-to-${to}.xlsx`}
          columns={COLUMNS}
          rows={data.rows.map((row) => ({ ...row, _key: row.product }))}
          totals={data.totals}
        />
      )}
    </>
  );
}

export default BestSellersReport;
