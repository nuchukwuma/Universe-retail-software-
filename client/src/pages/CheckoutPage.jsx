import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import TopBar from '../components/TopBar';
import Toast, { useToast } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import ScannerInput from '../components/checkout/ScannerInput';
import BillPanel from '../components/checkout/BillPanel';
import ProductGrid from '../components/checkout/ProductGrid';
import CategoryList from '../components/checkout/CategoryList';
import ActionBar from '../components/checkout/ActionBar';
import CheckoutModals from '../components/checkout/CheckoutModals';
import { useReceiptPrinting } from '../components/receipts/useReceiptPrinting';
import { useBill } from '../hooks/useBill';
import { useShortcuts } from '../hooks/useShortcuts';
import { formatNaira } from '../utils/formatNaira';
import '../styles/checkout.css';

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
  const { user } = useAuth();
  const { settings } = useSettings();
  const billState = useBill();
  const {
    bill, totals, addProduct, clearBill, setCustomer, loadBill, setItemDiscount, setBillDiscount, setApproval, updatePrices,
  } = billState;
  const { toast, showToast } = useToast();
  const { printSale } = useReceiptPrinting();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [lastAddedId, setLastAddedId] = useState(null);
  // Which pop-up is open, e.g. 'payment', 'discount', { type: 'receipt', sale } or null.
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState('');
  const [holdError, setHoldError] = useState('');
  const [pendingPayments, setPendingPayments] = useState(null); // kept while a manager approves
  const [mobileView, setMobileView] = useState('products'); // phones show products OR the bill
  const searchRef = useRef(null);

  const isCashier = user.role === 'cashier';

  // Load all products and categories, so adding items is instant.
  // Refresh them every 5 minutes so price changes reach the till.
  useEffect(() => {
    loadProducts();
    const timer = setInterval(loadProducts, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetches products and categories from the server, and puts the
  // latest prices on the bill.
  async function loadProducts() {
    try {
      const [productList, categoryList] = await Promise.all([api.get('/products'), api.get('/categories')]);
      setProducts(productList);
      setCategories(categoryList);
      updatePrices(productList);
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

  // Closes whatever pop-up is open.
  function closeModal() {
    setModal(null);
  }

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
    } else if (/^R?\d{6}-\d{4}$/i.test(code)) {
      // A receipt barcode was scanned: open the Return box for it.
      showToast('That is a receipt barcode. Use Return to refund items.', 'info');
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

  // Opens a pop-up that needs items on the bill (Pay, Hold, Discount).
  function openForBill(name) {
    if (bill.items.length === 0) {
      showToast('The bill is empty', 'error');
      return;
    }
    setPayError('');
    setHoldError('');
    setModal(name);
  }

  // ----- Payment -----

  // Sends the sale to the server. On success, clears the bill and shows the receipt.
  async function completeSale(payments, approvalToken = bill.approval?.token) {
    setSaving(true);
    setPayError('');
    try {
      const sale = await api.post('/sales', {
        items: bill.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        priceType: bill.priceType,
        billDiscount: bill.discount,
        customerId: bill.customer?._id || null,
        customerName: bill.customerName,
        approvalToken,
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
      setPendingPayments(null);
      loadProducts();

      // Auto-print (Settings) prints straight away; otherwise show the preview.
      if (settings.autoPrint) {
        const printed = await printSale(sale);
        setModal({ type: 'complete', sale: printed });
      } else {
        setModal({ type: 'receipt', sale });
      }
    } catch (err) {
      if (err.code === 'APPROVAL_REQUIRED') {
        // A large discount needs a manager: ask, then try again.
        setPendingPayments(payments);
        setModal('approveSale');
      } else {
        setPayError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // After a manager approves a large discount, saves the approval and retries the sale.
  function approveAndRetrySale(approval) {
    setApproval(approval);
    setModal('payment');
    completeSale(pendingPayments, approval.token);
  }

  // "Reprint later" on the receipt preview: close it; it can be printed from Sales History.
  function reprintLater() {
    closeModal();
    showToast('Saved. Print it any time from Sales History.', 'info');
  }

  // ----- Discount -----

  // Applies (or removes, when type is '') a discount chosen in the Discount box.
  function applyDiscount({ target, type, value, approval }) {
    if (target === 'bill') {
      setBillDiscount(type ? { type, value } : null);
    } else {
      setItemDiscount(target, type, value);
    }
    if (approval) setApproval(approval);
    closeModal();
    showToast(type ? 'Discount applied' : 'Discount removed', 'success');
  }

  // ----- Hold and Recall -----

  // Saves the current bill on the server to finish later, and empties the till.
  async function holdBill(label) {
    setSaving(true);
    setHoldError('');
    try {
      await api.post('/held-bills', {
        label: label || `Bill held at ${new Date().toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`,
        bill,
        itemCount: totals.quantityCount,
        total: totals.total,
      });
      clearBill();
      setLastAddedId(null);
      closeModal();
      showToast('Bill put on hold. Use Recall to bring it back.', 'success');
    } catch (err) {
      setHoldError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Opens the Recall box (only when the till is empty, so no bill is lost).
  function openRecall() {
    if (bill.items.length > 0) {
      showToast('Finish, hold or cancel the current bill first.', 'error');
      return;
    }
    setModal('recall');
  }

  // Brings a held bill back onto the till, then reloads products so the
  // bill shows today's prices.
  async function recallBill(held) {
    try {
      await api.delete(`/held-bills/${held._id}`);
    } catch (err) {
      showToast(err.message, 'error');
      return;
    }

    // Products deleted while the bill was on hold cannot be sold.
    const items = held.bill.items.filter((item) => productsById[item.productId]);
    const removed = held.bill.items.length - items.length;

    loadBill({ ...held.bill, items });
    closeModal();
    showToast(removed > 0 ? `Bill recalled. ${removed} deleted product(s) were removed.` : 'Bill recalled', 'success');
    loadProducts();
  }

  // ----- Other actions -----

  // Links the chosen customer to the bill.
  function pickCustomer(customer) {
    setCustomer(customer);
    closeModal();
  }

  // After feedback is saved.
  function feedbackSaved() {
    closeModal();
    showToast('Thank you! Feedback saved.', 'success');
  }

  // After a return is saved: show the return receipt and refresh stock.
  function returnDone(result) {
    setModal({ type: 'returnReceipt', ret: result.return });
    loadProducts();
  }

  // Keyboard shortcuts (switched off while a pop-up is open).
  useShortcuts(
    {
      F1: () => setModal('shortcuts'),
      F2: () => searchRef.current?.focus(),
      F3: () => setModal('customer'),
      F4: () => setModal('camera'),
      F6: () => openForBill('hold'),
      F7: openRecall,
      F8: () => openForBill('discount'),
      F9: cancelBill,
      F10: () => openForBill('payment'),
    },
    modal === null
  );

  if (loading) return <LoadingScreen message="Loading products..." />;

  // Everything the pop-up boxes need.
  const checkout = {
    bill, totals, settings, isCashier, lastAddedId, saving, payError, holdError,
    closeModal, completeSale, approveAndRetrySale, reprintLater, applyDiscount, holdBill, recallBill,
    pickCustomer, feedbackSaved, returnDone, handleScan,
  };

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
          onFeedback: () => setModal('feedback'),
          onRecall: openRecall,
          onReturn: () => setModal('return'),
          onCancel: cancelBill,
          onHold: () => openForBill('hold'),
          onDiscount: () => openForBill('discount'),
          onPay: () => openForBill('payment'),
        }}
      />
      <div className="checkout-hint">Press <kbd>F1</kbd> for shortcut list</div>

      <CheckoutModals modal={modal} c={checkout} />
    </div>
  );
}

export default CheckoutPage;
