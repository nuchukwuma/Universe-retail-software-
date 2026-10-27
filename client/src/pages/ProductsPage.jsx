import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import ProductImage from '../components/ProductImage';
import { formatNaira } from '../utils/formatNaira';
import { formatDate } from '../utils/dates';
import { isLowStock, expiryStatus, expiryLabel } from '../utils/stockAlerts';

// Returns true if the product matches the search box, category and status filters.
function matchesFilters(product, { search, categoryId, status }) {
  const query = search.trim().toLowerCase();
  if (query && !product.name.toLowerCase().includes(query) && !(product.barcode || '').includes(query)) {
    return false;
  }
  if (categoryId && product.category?._id !== categoryId) return false;
  if (status === 'low' && !isLowStock(product)) return false;
  if (status === 'expiring' && !expiryStatus(product)) return false;
  if (status === 'nobarcode' && product.barcode) return false;
  return true;
}

// Lists all products with search and filters, plus Edit and Delete buttons.
function ProductsPage() {
  // ?filter=low in the address opens the page already filtered (used by the dashboard).
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState(searchParams.get('filter') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load products and categories when the page opens.
  useEffect(() => {
    async function loadData() {
      try {
        const [productList, categoryList] = await Promise.all([api.get('/products'), api.get('/categories')]);
        setProducts(productList);
        setCategories(categoryList);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Deletes one product after asking for confirmation.
  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      const data = await api.delete(`/products/${product._id}`);
      setProducts(products.filter((p) => p._id !== product._id));
      setMessage(data.message);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleProducts = products.filter((p) => matchesFilters(p, { search, categoryId, status }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <Link to="/products/new" className="btn btn-primary">+ Add Product</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card filter-bar">
        <input
          type="search"
          placeholder="Search by name or barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All products</option>
          <option value="low">Low stock only</option>
          <option value="expiring">Expiring / expired only</option>
          <option value="nobarcode">No barcode</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading products...</p>
        ) : (
          <>
            <p className="muted small">Showing {visibleProducts.length} of {products.length} products</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th />
                    <th>Product</th>
                    <th>Category</th>
                    <th className="number">Cost</th>
                    <th className="number">Price</th>
                    <th className="number">Stock</th>
                    <th>Expiry</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => (
                    <tr key={product._id}>
                      <td><ProductImage product={product} /></td>
                      <td>
                        <strong>{product.name}</strong>
                        <div className="muted small">{product.barcode || 'No barcode'}</div>
                      </td>
                      <td>{product.category?.name || <span className="muted">None</span>}</td>
                      <td className="number">{formatNaira(product.costPrice)}</td>
                      <td className="number">
                        {formatNaira(product.sellingPrice)}
                        {product.wholesalePrice > 0 && (
                          <div className="muted small">Wholesale {formatNaira(product.wholesalePrice)}</div>
                        )}
                      </td>
                      <td className="number">
                        <span className={isLowStock(product) ? 'badge badge-red' : ''}>{product.quantity}</span>
                      </td>
                      <td>
                        {product.expiryDate ? formatDate(product.expiryDate) : <span className="muted">—</span>}
                        {expiryStatus(product) && (
                          <div>
                            <span className={expiryStatus(product) === 'expired' ? 'badge badge-red' : 'badge badge-orange'}>
                              {expiryLabel(product)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <Link to={`/products/${product._id}/edit`} className="btn btn-small">Edit</Link>
                          <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(product)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleProducts.length === 0 && <p className="muted">No products match your search.</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;
