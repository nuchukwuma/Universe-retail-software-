import { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { useReport } from '../../hooks/useReport';
import ReportTable from './ReportTable';
import { formatDate } from '../../utils/dates';

const COLUMNS = [
  { key: 'rank', header: 'Rank', type: 'number', width: 6 },
  { key: 'name', header: 'Product', type: 'text', width: 30 },
  { key: 'category', header: 'Category', type: 'text', width: 16 },
  { key: 'quantity', header: 'Quantity sold', type: 'number', width: 12 },
  { key: 'revenue', header: 'Sales value', type: 'money', width: 16 },
];

// Best-selling products, most sold first (returns taken off).
// Can be narrowed to one category.
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
      <div className="panel toolbar">
        <div className="field">
          <label className="field-label" htmlFor="best-category">Category</label>
          <select id="best-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {loading && !data && <p className="loading">Loading the report...</p>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {data && (
        <ReportTable
          title={categoryName ? `Best-selling products: ${categoryName}` : 'Best-selling products'}
          subtitle={`${formatDate(from)} to ${formatDate(to)}`}
          fileName={`best-sellers-${from}-to-${to}.xlsx`}
          columns={COLUMNS}
          rows={data.rows.map((row) => ({ ...row, _key: row.product }))}
          totals={data.rows.length ? data.totals : null}
        />
      )}
    </>
  );
}

export default BestSellersReport;
