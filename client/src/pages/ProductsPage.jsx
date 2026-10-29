import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import ScannerStatus from '../components/ScannerStatus';
import { useGlobalScanner } from '../hooks/useScanner';
import { formatNaira } from '../utils/formatNaira';
import { stockStatus } from '../utils/stock';

// Returns true if the product matches the search box, category and "show" filters.
function matchesFilters(product, { search, categoryId, show }) {
  const query = search.trim().toLowerCase();
  if (query && !product.name.toLowerCase().includes(query) && !(product.barcode || '').includes(query)) return false;
  if (categoryId && product.category?._id !== categoryId) return false;
  const status = stockStatus(product).key;
  if (show === 'low' && status === 'ok') return false;
  if (show === 'out' && status !== 'out') return false;
  if (show === 'nobarcode' && product.barcode) return false;
  return true;
}

// Every product, with search and filters. Scanning a barcode on this
// page opens that product (or starts a new one if nobody has that code).
function ProductsPage() {
  const navigate = useNavigate();
  // ?filter=low in the address opens the page already filtered (used by Today).
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [show, setShow] = useState(searchParams.get('filter') || '');
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

  // A scan opens the product with that barcode, or starts a new one.
  useGlobalScanner((code) => {
    const found = products.find((p) => p.barcode === code);
    if (found) navigate(`/products/${found._id}/edit`);
    else navigate(`/products/new?barcode=${encodeURIComponent(code)}`);
  }, !loading);

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

  // Clears every filter.
  function clearFilters() {
    setSearch('');
    setCategoryId('');
    setShow('');
  }

  const visibleProducts = products.filter((p) => matchesFilters(p, { search, categoryId, show }));

  return (
    <div className="page">
      <PageHeader title="Products" lead="Everything the shop sells, with its price and how many are in stock.">
        <Link to="/products/new" className="btn btn-primary">Add product</Link>
      </PageHeader>

      <ScannerStatus readyText="Scanner ready: scan a product to open it, or scan a new barcode to add a product." />
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="panel toolbar">
        <div className="field">
          <label className="field-label" htmlFor="products-search">Search</label>
          <input id="products-search" type="search" placeholder="Name or barcode" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="products-category">Category</label>
          <select id="products-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="products-show">Show</label>
          <select id="products-show" value={show} onChange={(e) => setShow(e.target.value)}>
            <option value="">All products</option>
            <option value="low">Low or out of stock</option>
            <option value="out">Out of stock</option>
            <option value="nobarcode">No barcode yet</option>
          </select>
        </div>
      </div>

      <section className="panel panel-flush" aria-label="Product list">
        {loading && <p className="loading">Loading products...</p>}

        {!loading && products.length === 0 && !error && (
          <div className="empty">
            <p className="strong">No products yet.</p>
            <p className="muted">Add your first product, or scan its barcode to start.</p>
            <div className="btn-row"><Link to="/products/new" className="btn btn-primary">Add product</Link></div>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div className="panel-head">
              <p>Showing {visibleProducts.length} of {products.length} products</p>
            </div>
            {visibleProducts.length === 0 ? (
              <div className="empty">
                <p>No product matches these filters.</p>
                <div className="btn-row"><button type="button" className="btn" onClick={clearFilters}>Clear filters</button></div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th className="num">Price</th>
                      <th className="num">In stock</th>
                      <th className="num">Low at</th>
                      <th>Status</th>
                      <th><span className="visually-hidden">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((product) => {
                      const status = stockStatus(product);
                      return (
                        <tr key={product._id}>
                          <td>
                            <span className="cell-main">{product.name}</span>
                            <span className="cell-sub">{product.barcode || 'No barcode'}</span>
                          </td>
                          <td>{product.category?.name || <span className="muted">None</span>}</td>
                          <td className="num">{formatNaira(product.sellingPrice)}</td>
                          <td className="num strong">{product.quantity}</td>
                          <td className="num muted">{product.reorderLevel}</td>
                          <td><span className={`status status-${status.key}`}>{status.label}</span></td>
                          <td className="actions">
                            <Link to={`/products/${product._id}/edit`} className="btn btn-quiet">Edit<span className="visually-hidden"> {product.name}</span></Link>
                            <button type="button" className="btn btn-quiet btn-danger" onClick={() => handleDelete(product)}>
                              Delete<span className="visually-hidden"> {product.name}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default ProductsPage;
