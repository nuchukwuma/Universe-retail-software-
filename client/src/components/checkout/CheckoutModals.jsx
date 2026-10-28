import CompleteSaleModal from './CompleteSaleModal';
import SaleCompleteModal from './SaleCompleteModal';
import CustomerPickerModal from './CustomerPickerModal';
import ShortcutsModal from './ShortcutsModal';
import DiscountModal from './DiscountModal';
import HoldBillModal from './HoldBillModal';
import RecallModal from './RecallModal';
import FeedbackModal from './FeedbackModal';
import FindProductModal from './FindProductModal';
import { ManagerApprovalModal } from './ManagerApprovalForm';
import ReturnModal from '../returns/ReturnModal';
import SaleReceiptModal from '../receipts/SaleReceiptModal';
import ReturnReceiptModal from '../receipts/ReturnReceiptModal';
import { formatNaira } from '../../utils/formatNaira';

// Shows whichever dialog the sales screen has open.
// "modal" says which one; "c" (the checkout) holds the data and actions.
function CheckoutModals({ modal, c }) {
  const close = c.closeModal;
  const type = typeof modal === 'string' ? modal : modal?.type;

  switch (type) {
    case 'complete':
      return (
        <CompleteSaleModal bill={c.bill} totals={c.totals} saving={c.saving} error={c.saleError} onConfirm={() => c.completeSale()} onClose={close} />
      );
    case 'approveSale':
      return (
        <ManagerApprovalModal
          reason={`The discount on this bill is ${c.totals.discountPercent.toFixed(1)}%, more than the ${c.settings.maxCashierDiscountPercent}% cashiers can give on their own.`}
          onApproved={c.approveAndRetrySale}
          onClose={close}
        />
      );
    case 'find':
      return <FindProductModal products={c.products} categories={c.categories} startText={modal.text || ''} onAdd={c.addToBill} onClose={close} />;
    case 'customer':
      return <CustomerPickerModal onSelect={c.pickCustomer} onWalkIn={c.setWalkIn} onClose={close} />;
    case 'shortcuts':
      return <ShortcutsModal onClose={close} />;
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
      return <HoldBillModal defaultLabel={c.bill.customerName} saving={c.saving} error={c.holdError} onHold={c.holdBill} onClose={close} />;
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
          banner={<div className="notice notice-success"><span className="notice-title">Refund the customer {formatNaira(modal.ret.refundTotal)}</span>The items are back in stock.</div>}
          onClose={close}
        />
      );
    case 'receipt':
      return (
        <SaleReceiptModal
          sale={modal.sale}
          banner={<div className="notice notice-success"><span className="notice-title">Sale completed: {formatNaira(modal.sale.total)}</span>Receipt {modal.sale.receiptNumber}</div>}
          onClose={close}
          onPrinted={close}
          extraButtons={<button type="button" className="btn" onClick={c.printLater}>Print later</button>}
        />
      );
    case 'done':
      return <SaleCompleteModal sale={modal.sale} onClose={close} />;
    default:
      return null;
  }
}

export default CheckoutModals;
