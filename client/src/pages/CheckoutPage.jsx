import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/api';
import TopBar from '../components/TopBar';
import Toast, { useToast } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import ScannerInput from '../components/checkout/ScannerInput';
import BillPanel from '../components/checkout/BillPanel';
import ProductGrid from '../components/checkout/ProductGrid';
import CategoryList from '../components/checkout/CategoryList';
import ActionBar from '../components/checkout/ActionBar';
import PaymentModal from '../components/checkout/PaymentModal';
import SaleCompleteModal from '../components/checkout/SaleCompleteModal';
import CustomerPickerModal from '../components/checkout/CustomerPickerModal';
import ShortcutsModal from '../components/checkout/ShortcutsModal';
import BarcodeNotFoundModal from '../components/checkout/BarcodeNotFoundModal';
import { useBill } from '../hooks/useBill';
import { useShortcuts } from '../hooks/useShortcuts';
import { formatNaira } from '../utils/formatNaira';
import '../styles/checkout.css';

// The camera library is big, so load it only when first used.
const CameraScanner = lazy(() => import('../components/CameraScanner'));

// Returns the products to show in the grid: search results (from all
// categories) when there is search text, otherwise the chosen category.
function filterProducts(products, categoryId, search) {
  const query = search.trim().toLowerCase();
  if (query) {
    return products.filter((p) => p.name.toLowerCase().includes(query) || (p.barcode || '').startsWith(query));
  }
  if (categoryId === 'all') return products;
  return products.filter((p) => p.category?._id === categoryId);
}

// The checkout screen: the first page a cashier sees after login.
function CheckoutPage() {
  const billState = useBill();
  const { bill, totals, addProduct, clearBill, setCustomer } = billState;
  const { toast, showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [lastAddedId, setLastAddedId] = useState(null);
  // Which pop-up is open: null, 'payment', 'customer', 'shortcuts', 'camera',
  // { type: 'notFound', code } or { type: 'complete', sale }
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState('');
  const [mobileView, setMobileView] = useState('products'); // phones show products OR the bill
  const searchRef = useRef(null);

  // Load all products and categories once, so adding items is instant.
  useEffect(() => {
    loadProducts();
  }, []);

  // Fetches products and categories from the server.
  async function loadProducts() {
    try {
      const [productList, categoryList] = await Promise.all([api.get('/products'), api.get('/categories')]);
      setProducts(productList);
      setCategories(categoryList);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Quick lookups: barcode -> product and id -> product.
  const productsByBarcode = useMemo(() => {
    const map = new Map();
    products.forEach((p) => p.barcode && map.set(p.barcode, p));
    return map;
  }, [products]);

  const productsById = useMemo(() => Object.fromEntries(products.map((p) => [p._id, p])), [products]);

  const visibleProducts = useMemo(
    () => filterProducts(products, categoryId, search),
    [products, categoryId, search]
  );

  // Adds one of a product to the bill and highlights it.
  function addToBill(product) {
    addProduct(product);
    setLastAddedId(product._id);
  }

  // Runs for every barcode from the USB scanner or the camera.
  function handleScan(code, fromCamera = false) {
    const product = productsByBarcode.get(code);
    if (product) {
      addToBill(product);
      showToast(`Added: ${product.name}`, 'success');
    } else if (fromCamera) {
      showToast(`No product has the barcode ${code}`, 'error');
    } else {
      setModal({ type: 'notFound', code });
    }
  }

  // Enter in the search box: add the product if the text is a known
  // barcode or matches exactly one product.
  function handleSearchKeyDown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const text = search.trim();
    if (!text) return;

    const byBarcode = productsByBarcode.get(text);
    if (byBarcode) {
      addToBill(byBarcode);
      setSearch('');
    } else if (visibleProducts.length === 1) {
      addToBill(visibleProducts[0]);
      setSearch('');
    } else if (/^\d{6,}$/.test(text)) {
      setModal({ type: 'notFound', code: text });
      setSearch('');
    }
  }

  // Empties the bill after checking with the cashier.
  function cancelBill() {
    if (bill.items.length > 0 && window.confirm('Cancel this bill and remove all items?')) {
      clearBill();
      showToast('Bill cancelled', 'info');
    }
  }

  // Opens the payment box (only if there is something to pay for).
  function openPayment() {
    if (bill.items.length === 0) {
      showToast('The bill is empty', 'error');
      return;
    }
    setPayError('');
    setModal('payment');
  }

  // Sends the sale to the server. On success, clears the bill and shows the result.
  async function completeSale(payments) {
    setSaving(true);
    setPayError('');
    try {
      const sale = await api.post('/sales', {
        items: bill.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        priceType: bill.priceType,
        customerId: bill.customer?._id || null,
        customerName: bill.customerName,
        payments,
      });

      // Update stock on screen straight away, then refresh quietly from the server.
      setProducts((current) =>
        current.map((p) => {
          const sold = sale.items.find((item) => item.product === p._id);
          return sold ? { ...p, quantity: p.quantity - sold.quantity } : p;
        })
      );
      clearBill();
      setLastAddedId(null);
      setModal({ type: 'complete', sale });
      loadProducts();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Shown for buttons that arrive in Stage 4.
  function comingSoon(name) {
    showToast(`${name} will be added in Stage 4`, 'info');
  }

  // Keyboard shortcuts (switched off while a pop-up is open).
  useShortcuts(
    {
      F1: () => setModal('shortcuts'),
      F2: () => searchRef.current?.focus(),
      F3: () => setModal('customer'),
      F4: () => setModal('camera'),
      F9: cancelBill,
      F10: openPayment,
    },
    modal === null
  );

  if (loading) return <LoadingScreen message="Loading products..." />;

  return (
    <div className="checkout-page">
      <TopBar showBackOfficeLink />
      <ScannerInput onScan={handleScan} paused={modal !== null} />
      <Toast toast={toast} />

      {loadError && (
        <div className="alert alert-error checkout-alert">
          {loadError} <button type="button" className="btn btn-small" onClick={loadProducts}>Try again</button>
        </div>
      )}

      <div className="mobile-tabs">
        <button type="button" className={mobileView === 'products' ? 'active' : ''} onClick={() => setMobileView('products')}>
          Products
        </button>
        <button type="button" className={mobileView === 'bill' ? 'active' : ''} onClick={() => setMobileView('bill')}>
          Bill ({totals.quantityCount}) · {formatNaira(totals.total)}
        </button>
      </div>

      <main className={`checkout-main show-${mobileView}`}>
        <BillPanel
          billState={billState}
          productsById={productsById}
          lastAddedId={lastAddedId}
          onPickCustomer={() => setModal('customer')}
        />

        <section className="product-panel">
          <div className="product-search-bar">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search products by name or barcode (F2)"
              aria-label="Search products"
            />
            <button type="button" className="btn btn-icon" onClick={() => setModal('camera')} title="Scan with camera (F4)">
              📷
            </button>
          </div>
          <ProductGrid
            key={`${categoryId}-${search}`}
            products={visibleProducts}
            priceType={bill.priceType}
            onAdd={addToBill}
          />
        </section>

        <CategoryList
          categories={categories}
          activeId={search ? null : categoryId}
          onSelect={(id) => {
            setCategoryId(id);
            setSearch('');
          }}
        />
      </main>

      <ActionBar
        total={totals.total}
        hasItems={bill.items.length > 0}
        actions={{
          onFeedback: () => comingSoon('Feedback'),
          onRecall: () => comingSoon('Recall'),
          onReturn: () => comingSoon('Return'),
          onCancel: cancelBill,
          onHold: () => comingSoon('Hold'),
          onDiscount: () => comingSoon('Discount'),
          onPay: openPayment,
        }}
      />
      <div className="checkout-hint">Press <kbd>F1</kbd> for shortcut list</div>

      {modal === 'payment' && (
        <PaymentModal
          total={totals.total}
          saving={saving}
          error={payError}
          onConfirm={completeSale}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'customer' && (
        <CustomerPickerModal
          onSelect={(customer) => {
            setCustomer(customer);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'shortcuts' && <ShortcutsModal onClose={() => setModal(null)} />}
      {modal === 'camera' && (
        <Suspense fallback={null}>
          <CameraScanner continuous onScan={(code) => handleScan(code, true)} onClose={() => setModal(null)} />
        </Suspense>
      )}
      {modal?.type === 'notFound' && <BarcodeNotFoundModal code={modal.code} onClose={() => setModal(null)} />}
      {modal?.type === 'complete' && <SaleCompleteModal sale={modal.sale} onClose={() => setModal(null)} />}
    </div>
  );
}

export default CheckoutPage;
