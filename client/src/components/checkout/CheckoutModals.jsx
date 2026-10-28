import { lazy, Suspense } from 'react';
import PaymentModal from './PaymentModal';
import SaleCompleteModal from './SaleCompleteModal';
import CustomerPickerModal from './CustomerPickerModal';
import ShortcutsModal from './ShortcutsModal';
import BarcodeNotFoundModal from './BarcodeNotFoundModal';
import DiscountModal from './DiscountModal';
import HoldBillModal from './HoldBillModal';
import RecallModal from './RecallModal';
import FeedbackModal from './FeedbackModal';
import { ManagerApprovalModal } from './ManagerApprovalForm';
import ReturnModal from '../returns/ReturnModal';
import SaleReceiptModal from '../receipts/SaleReceiptModal';
import ReturnReceiptModal from '../receipts/ReturnReceiptModal';
import { formatNaira } from '../../utils/formatNaira';

// The camera library is big, so load it only when first used.
const CameraScanner = lazy(() => import('../CameraScanner'));

// The green "Give change" box shown above the receipt after a sale.
function ChangeBanner({ sale }) {
  return (
    <div className={sale.change > 0 ? 'change-due' : 'change-due change-none'}>
      <span>{sale.change > 0 ? 'Give change' : 'No change due'}</span>
      <strong>{formatNaira(sale.change)}</strong>
    </div>
  );
}

// Shows whichever pop-up box the checkout currently has open.
// "modal" says which one; "c" (the checkout) holds the data and actions.
function CheckoutModals({ modal, c }) {
  const close = c.closeModal;
  const type = typeof modal === 'string' ? modal : modal?.type;

  switch (type) {
    case 'payment':
      return <PaymentModal total={c.totals.total} saving={c.saving} error={c.payError} onConfirm={c.completeSale} onClose={close} />;
    case 'approveSale':
      return (
        <ManagerApprovalModal
          reason={`The discount on this bill is ${c.totals.discountPercent.toFixed(1)}%, above the ${c.settings.maxCashierDiscountPercent}% cashiers can give.`}
          onApproved={c.approveAndRetrySale}
          onClose={close}
        />
      );
    case 'customer':
      return <CustomerPickerModal onSelect={c.pickCustomer} onClose={close} />;
    case 'shortcuts':
      return <ShortcutsModal onClose={close} />;
    case 'camera':
      return (
        <Suspense fallback={null}>
          <CameraScanner continuous onScan={(code) => c.handleScan(code, true)} onClose={close} />
        </Suspense>
      );
    case 'notFound':
      return <BarcodeNotFoundModal code={modal.code} onClose={close} />;
    case 'discount':
      return (
        <DiscountModal
          bill={c.bill}
          startTarget={c.lastAddedId}
          maxPercent={c.settings.maxCashierDiscountPercent}
          needsApprovalCheck={c.isCashier}
          onApply={c.applyDiscount}
          onClose={close}
        />
      );
    case 'hold':
      return (
        <HoldBillModal
          defaultLabel={c.bill.customerName}
          saving={c.saving}
          error={c.holdError}
          onHold={c.holdBill}
          onClose={close}
        />
      );
    case 'recall':
      return <RecallModal onRecall={c.recallBill} onClose={close} />;
    case 'feedback':
      return <FeedbackModal defaultCustomerName={c.bill.customerName} onSaved={c.feedbackSaved} onClose={close} />;
    case 'return':
      return <ReturnModal onDone={c.returnDone} onClose={close} />;
    case 'returnReceipt':
      return (
        <ReturnReceiptModal
          ret={modal.ret}
          banner={<div className="change-due"><span>Refund to customer</span><strong>{formatNaira(modal.ret.refundTotal)}</strong></div>}
          onClose={close}
        />
      );
    case 'receipt':
      return (
        <SaleReceiptModal
          sale={modal.sale}
          banner={<ChangeBanner sale={modal.sale} />}
          onClose={close}
          extraButtons={
            <>
              <button type="button" className="btn" onClick={c.reprintLater}>Reprint later</button>
              <button type="button" className="btn" onClick={close}>Skip</button>
            </>
          }
        />
      );
    case 'complete':
      return <SaleCompleteModal sale={modal.sale} onClose={close} />;
    default:
      return null;
  }
}

export default CheckoutModals;
