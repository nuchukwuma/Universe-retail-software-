import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import TopBar from '../components/TopBar';
import Toast, { useToast } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import ScanBox from '../components/checkout/ScanBox';
import BillTable from '../components/checkout/BillTable';
import PriceTicket from '../components/checkout/PriceTicket';
import TillActions from '../components/checkout/TillActions';
import CheckoutModals from '../components/checkout/CheckoutModals';
import { useReceiptPrinting } from '../components/receipts/useReceiptPrinting';
import { useBill } from '../hooks/useBill';
import { useShortcuts } from '../hooks/useShortcuts';
import { useGlobalScanner } from '../hooks/useScanner';
import { canUseBackOffice } from '../utils/roles';
import { formatNaira } from '../utils/formatNaira';
import '../styles/pos.css';

// A receipt number like 261027-0001 (or a return, R261027-0001).
const RECEIPT_PATTERN = /^R?\d{6}-\d{4}$/i;

// The sales screen (the till): the first page a cashier sees after login.
function CheckoutPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const billState = useBill();
  const { bill, totals, addProduct, clearBill, loadBill, setItemDiscount, setBillDiscount, setApproval, updatePrices } = billState;
  const { toast, showToast } = useToast();
  const { printSale } = useReceiptPrinting();
  const scanRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastAddedId, setLastAddedId] = useState(null);
  // What the last scan did: { kind: 'added' | 'notFound' | 'info', text, code }
  const [scanResult, setScanResult] = useState(null);
  // Which dialog is open, e.g. 'complete', 'discount', { type: 'receipt', sale } or null.
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [holdError, setHoldError] = useState('');

  const isCashier = user.role === 'cashier';
  const modalType = typeof modal === 'string' ? modal : modal?.type;

  // Load all products and categories, so adding items is instant.
  // Refresh them every 5 minutes so price changes reach the till.
  useEffect(() => {
    loadProducts();
    const timer = setInterval(loadProducts, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetches products and categories, and puts the latest prices on the bill.
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

  // Closes whatever dialog is open (the scan box takes the focus back).
  function closeModal() {
    setModal(null);
  }

  // Adds one of a product to the bill and highlights its line.
  function addToBill(product) {
    addProduct(product);
    setLastAddedId(product._id);
    setScanResult({ kind: 'added', text: `Added ${product.name}, ${formatNaira(product.sellingPrice)}` });
  }

  // Runs for every code from the scan box: look it up and add it.
  // "source" is 'scanner' or 'keyboard' (a person typed it).
  function handleCode(code, source) {
    const product = productsByBarcode.get(code);
    if (product) {
      addToBill(product);
    } else if (RECEIPT_PATTERN.test(code)) {
      setScanResult({ kind: 'info', text: `${code} is a receipt. To refund items from it, press Return.` });
    } else if (source === 'keyboard' && /[a-z]/i.test(code)) {
      // A person typed a word, not a barcode: search by name instead.
      setScanResult(null);
      setModal({ type: 'find', text: code });
    } else {
      setScanResult({ kind: 'notFound', code });
    }
  }

  // A scan that arrived while the focus was somewhere else on the page.
  function handleScanElsewhere(code) {
    if (modal === null) {
      handleCode(code, 'scanner');
    } else if (modalType === 'find') {
      const product = productsByBarcode.get(code);
      if (product) {
        addToBill(product);
        showToast(`Added ${product.name}`, 'success');
      } else {
        showToast(`Product not found: no product has the barcode ${code}.`, 'error');
      }
    } else {
      // Never let a scan press a button in an open window (e.g. Complete sale).
      showToast('Finish or close the open window, then scan again.', 'error');
    }
  }
  useGlobalScanner(handleScanElsewhere);

  // Empties the bill after checking with the cashier.
  function cancelBill() {
    if (bill.items.length > 0 && window.confirm('Cancel this bill and take every item off it?')) {
      clearBill();
      setLastAddedId(null);
      setScanResult(null);
      showToast('Bill cancelled');
    }
  }

  // Opens a dialog that needs items on the bill.
  function openForBill(name) {
    if (bill.items.length === 0) {
      showToast('The bill is empty. Scan an item first.', 'error');
      return;
    }
    setSaleError('');
    setHoldError('');
    setModal(name);
  }

  // ----- Completing the sale -----

  // Saves the sale. On success, empties the bill and shows the receipt.
  async function completeSale(approvalToken = bill.approval?.token) {
    setSaving(true);
    setSaleError('');
    try {
      const sale = await api.post('/sales', {
        items: bill.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        billDiscount: bill.discount,
        approvalToken,
      });

      // Show the new stock straight away, then refresh quietly from the server.
      setProducts((current) =>
        current.map((p) => {
          const sold = sale.items.find((item) => item.product === p._id);
          return sold ? { ...p, quantity: p.quantity - sold.quantity } : p;
        })
      );
      clearBill();
      setLastAddedId(null);
      setScanResult(null);
      loadProducts();

      // Auto-print (Settings) prints straight away; otherwise show the receipt.
      if (settings.autoPrint) {
        setModal({ type: 'done', sale: await printSale(sale) });
      } else {
        setModal({ type: 'receipt', sale });
      }
    } catch (err) {
      if (err.code === 'APPROVAL_REQUIRED') {
        setModal('approveSale'); // a large discount needs a manager
      } else {
        setSaleError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // After a manager approves a large discount, try the sale again.
  function approveAndRetrySale(approval) {
    setApproval(approval);
    setModal('complete');
    completeSale(approval.token);
  }

  // "Print later" on the receipt: it can be printed from Sales history.
  function printLater() {
    closeModal();
    showToast('Sale saved. Print the receipt any time from Sales history.');
  }

  // ----- Discount -----

  // Applies (or removes, when type is '') a discount.
  function applyDiscount({ target, type, value, approval }) {
    if (target === 'bill') setBillDiscount(type ? { type, value } : null);
    else setItemDiscount(target, type, value);
    if (approval) setApproval(approval);
    closeModal();
    showToast(type ? 'Discount applied' : 'Discount removed', 'success');
  }

  // ----- Hold and recall -----

  // Saves the bill on the server to finish later, and empties the till.
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
      setScanResult(null);
      closeModal();
      showToast('Bill on hold. Press F7 to recall it.', 'success');
    } catch (err) {
      setHoldError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Opens Recall (only when the till is empty, so no bill is lost).
  function openRecall() {
    if (bill.items.length > 0) {
      showToast('Complete, hold or cancel this bill first.', 'error');
      return;
    }
    setModal('recall');
  }

  // Puts a held bill back on the till, with today's prices.
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
    showToast(removed > 0 ? `Bill recalled. ${removed} deleted product(s) were taken off.` : 'Bill recalled', 'success');
    loadProducts();
  }

  // ----- Returns -----

  // After a return: show the return receipt and refresh stock.
  function returnDone(result) {
    setModal({ type: 'returnReceipt', ret: result.return });
    loadProducts();
  }

  // Keyboard shortcuts (off while a dialog is open; dialogs have their own keys).
  useShortcuts(
    {
      F1: () => setModal('shortcuts'),
      F2: () => setModal({ type: 'find' }),
      F6: () => openForBill('hold'),
      F7: openRecall,
      F8: () => openForBill('discount'),
      F9: cancelBill,
      F10: () => openForBill('complete'),
      Escape: () => scanRef.current?.focus(),
    },
    modal === null
  );

  if (loading) return <LoadingScreen message="Loading products..." />;

  // Everything the dialogs need.
  const checkout = {
    bill, totals, settings, isCashier, lastAddedId, saving, saleError, holdError, products, categories,
    closeModal, addToBill, completeSale, approveAndRetrySale, printLater, applyDiscount, holdBill, recallBill,
    returnDone,
  };

  return (
    <div className="till">
      <TopBar />

      {loadError && (
        <div className="notice notice-error" role="alert">
          <span className="notice-title">The product list could not be loaded.</span>
          {loadError}
          <div className="btn-row">
            <button type="button" className="btn btn-small" onClick={loadProducts}>Try again</button>
          </div>
        </div>
      )}

      <main className="till-main">
        <section className="till-bill" aria-label="Bill">
          <ScanBox ref={scanRef} onSubmit={handleCode} paused={modal !== null}>
            {scanResult?.kind === 'added' && <p className="scan-result success-text">{scanResult.text}</p>}
            {scanResult?.kind === 'info' && <p className="scan-result">{scanResult.text}</p>}
          </ScanBox>

          {scanResult?.kind === 'notFound' && (
            <div className="notice notice-error" role="alert">
              <span className="notice-title">Product not found</span>
              No product has the barcode {scanResult.code}. Check the number and scan again
              {canUseBackOffice(user) ? ', or add it as a new product.' : ', or ask a manager to add it.'}
              <div className="btn-row">
                {canUseBackOffice(user) && (
                  <button type="button" className="btn btn-small" onClick={() => navigate(`/products/new?barcode=${encodeURIComponent(scanResult.code)}&from=checkout`)}>
                    Add as a new product
                  </button>
                )}
                <button type="button" className="btn btn-small btn-quiet" onClick={() => setScanResult(null)}>Dismiss</button>
              </div>
            </div>
          )}

          <div className="bill-lines">
            <BillTable billState={billState} productsById={productsById} lastAddedId={lastAddedId} />
          </div>

          {totals.billDiscount > 0 && (
            <div className="bill-discount">
              <span>
                Discount on the whole bill{bill.discount.type === 'percent' ? ` (${bill.discount.value}%)` : ''}: minus{' '}
                <strong>{formatNaira(totals.billDiscount)}</strong>
              </span>
              <button type="button" className="btn btn-quiet btn-danger" onClick={() => setBillDiscount(null)}>Remove discount</button>
            </div>
          )}
        </section>

        <aside className="till-side">
          <PriceTicket totals={totals} onComplete={() => openForBill('complete')} />
          <div className="till-tools">
            <TillActions
              hasItems={bill.items.length > 0}
              actions={{
                onFind: () => setModal({ type: 'find' }),
                onDiscount: () => openForBill('discount'),
                onHold: () => openForBill('hold'),
                onRecall: openRecall,
                onReturn: () => setModal('return'),
                onCancel: cancelBill,
              }}
            />
            <p className="till-hint">Press F1 for all keyboard shortcuts.</p>
          </div>
        </aside>
      </main>

      <Toast toast={toast} />
      <CheckoutModals modal={modal} c={checkout} />
    </div>
  );
}

export default CheckoutPage;
