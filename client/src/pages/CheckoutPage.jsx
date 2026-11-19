import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Toast, { useToast } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import ScanBox from '../components/checkout/ScanBox';
import BillTable from '../components/checkout/BillTable';
import PriceTicket from '../components/checkout/PriceTicket';
import TillActions from '../components/checkout/TillActions';
import ProductTiles from '../components/checkout/ProductTiles';
import BillTabs from '../components/checkout/BillTabs';
import CheckoutModals from '../components/checkout/CheckoutModals';
import { useReceiptPrinting } from '../components/receipts/useReceiptPrinting';
import { useBill } from '../hooks/useBill';
import { useShortcuts } from '../hooks/useShortcuts';
import { useGlobalScanner } from '../hooks/useScanner';
import { canUseBackOffice } from '../utils/roles';
import { formatNaira } from '../utils/formatNaira';
import { pointsDiscount } from '../utils/loyalty';

// A receipt number like 261027-0001 (or a return, R261027-0001).
const RECEIPT_PATTERN = /^R?\d{6}-\d{4}$/i;

// The sales screen (the till): the first page a cashier sees after login.
function CheckoutPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const billState = useBill();
  const { bill, bills, activeIndex, totals: billOnlyTotals, setCustomer, setPointsToUse, addProduct, clearBill, newBill, switchBill, closeBill, setItemDiscount, setBillDiscount, setApproval, updatePrices } = billState;
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

  const isCashier = user.role === 'cashier';
  const loyalty = Boolean(settings.loyaltyEnabled);

  // The bill's totals with any loyalty points spent taken off.
  const spent = loyalty && bill.customer
    ? pointsDiscount(settings, Math.min(bill.pointsToUse, bill.customer.points), billOnlyTotals.total)
    : { points: 0, amount: 0 };
  const totals = {
    ...billOnlyTotals,
    pointsUsed: spent.points,
    pointsDiscount: spent.amount,
    discountTotal: billOnlyTotals.discountTotal + spent.amount,
    total: Math.round((billOnlyTotals.total - spent.amount) * 100) / 100,
  };
  const modalType = typeof modal === 'string' ? modal : modal?.type;

  // Load all products and categories, so adding items is instant.
  // Refresh them every 5 minutes so price changes reach the till.
  useEffect(() => {
    loadProducts();
    bringInHeldBills();
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

  // Bills put on hold by an older version (on the server) open as tabs.
  async function bringInHeldBills() {
    try {
      const held = await api.get('/held-bills');
      for (const h of held) {
        if (!newBill({ ...h.bill, label: h.label })) break;
        await api.delete(`/held-bills/${h._id}`);
      }
    } catch {
      // nothing to bring in
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
        customerId: loyalty && bill.customer ? bill.customer._id : undefined,
        pointsToUse: spent.points,
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

  // ----- Open bills (tabs) -----

  // Opens a new, empty bill; the one being served stays open in its tab.
  function openNewBill() {
    if (!newBill()) {
      showToast(`At most ${billState.maxBills} bills can be open. Complete or close one first.`, 'error');
      return;
    }
    setLastAddedId(null);
    setScanResult(null);
  }

  // Serves the next open bill (F7), round the tabs.
  function nextBill() {
    if (bills.length > 1) switchBill((activeIndex + 1) % bills.length);
  }

  // The x on a tab: a bill with items is cancelled after asking.
  function closeTab(index) {
    const b = bills[index];
    if (b.items.length > 0 && !window.confirm(`Close ${b.label || b.customer?.name || `Bill ${index + 1}`} and take every item off it?`)) return;
    closeBill(index);
    setLastAddedId(null);
    setScanResult(null);
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
      F6: openNewBill,
      F7: nextBill,
      F8: () => openForBill('discount'),
      F4: () => loyalty && setModal('customer'),
      F9: cancelBill,
      F10: () => openForBill('complete'),
      Escape: () => scanRef.current?.focus(),
    },
    modal === null
  );

  if (loading) return <LoadingScreen message="Loading products..." />;

  // Everything the dialogs need.
  const checkout = {
    bill, totals, settings, isCashier, lastAddedId, saving, saleError, products, categories,
    closeModal, addToBill, completeSale, approveAndRetrySale, printLater, applyDiscount, setCustomer, setPointsToUse, billOnlyTotals,
    returnDone,
  };

  return (
    <div className="till">
      <section className="till-bill" aria-label="Bill">
        <BillTabs
          bills={bills}
          activeIndex={activeIndex}
          onSwitch={(index) => {
            switchBill(index);
            setLastAddedId(null);
            setScanResult(null);
          }}
          onClose={closeTab}
          onNew={openNewBill}
          canAddMore={bills.length < billState.maxBills}
        />

        <ScanBox ref={scanRef} products={products} onSubmit={handleCode} onPick={addToBill} paused={modal !== null}>
          {scanResult?.kind === 'added' && <p className="scan-result success-text">{scanResult.text}</p>}
          {scanResult?.kind === 'info' && <p className="scan-result">{scanResult.text}</p>}
        </ScanBox>

        {loadError && (
          <div className="notice notice-error till-notice" role="alert">
            <span className="notice-title">Products could not be loaded</span>
            {loadError}
            <div className="btn-row">
              <button type="button" className="btn btn-small" onClick={loadProducts}>Try again</button>
            </div>
          </div>
        )}

        {scanResult?.kind === 'notFound' && (
          <div className="notice notice-error till-notice" role="alert">
            <span className="notice-title">No product has the barcode {scanResult.code}</span>
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
              Bill discount{bill.discount.type === 'percent' ? ` ${bill.discount.value}%` : ''}: minus <strong>{formatNaira(totals.billDiscount)}</strong>
            </span>
            <button type="button" className="btn btn-quiet btn-danger btn-small" onClick={() => setBillDiscount(null)}>Remove</button>
          </div>
        )}

        <TillActions
          hasItems={bill.items.length > 0}
          loyalty={loyalty}
          customerName={bill.customer?.name}
          actions={{
            onFind: () => setModal({ type: 'find' }),
            onDiscount: () => openForBill('discount'),
            onNewBill: openNewBill,
            onCustomer: () => setModal('customer'),
            onReturn: () => setModal('return'),
            onCancel: cancelBill,
          }}
        />
        <PriceTicket totals={totals} onComplete={() => openForBill('complete')} />
      </section>

      <ProductTiles products={products} categories={categories} onAdd={addToBill} />

      <Toast toast={toast} />
      <CheckoutModals modal={modal} c={checkout} />
    </div>
  );
}

export default CheckoutPage;
