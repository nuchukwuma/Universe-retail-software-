import BarcodeSvg from '../BarcodeSvg';
import { ReceiptFrame, Divider, Row, money } from './ReceiptParts';
import { PAYMENT_LABELS } from '../../utils/billMath';
import { formatDateTime } from '../../utils/dates';

// Shows each payment part. For cash, the amount the customer HANDED OVER
// is shown (the sale stores the cash kept, so we add the change back).
function paymentLines(sale) {
  return sale.payments.map((p) => ({
    label: PAYMENT_LABELS[p.method],
    amount: p.method === 'cash' ? p.amount + sale.change : p.amount,
    reference: p.reference,
  }));
}

// The printed receipt for a sale. Works for 58mm, 80mm and A4 paper.
function SaleReceipt({ sale, settings, paper, duplicate = false }) {
  return (
    <ReceiptFrame settings={settings} paper={paper} duplicate={duplicate} footer={settings.footerMessage}>
      <Row left="Receipt No:" right={sale.receiptNumber} />
      <Row left="Date:" right={formatDateTime(sale.createdAt)} />
      <Row left="Cashier:" right={sale.cashierName} />
      {sale.customerName && <Row left="Customer:" right={sale.customerName} />}
      {sale.priceType === 'wholesale' && <Row left="Price type:" right="Wholesale" />}
      <Divider />

      {sale.items.map((item, index) => (
        <div key={index} className="receipt-item">
          <div className="receipt-item-name">{item.name}</div>
          <Row indent left={`${item.quantity} x ${money(item.unitPrice)}`} right={money(item.unitPrice * item.quantity)} />
          {item.discount > 0 && (
            <Row
              indent
              left={`Discount${item.discountType === 'percent' ? ` (${item.discountValue}%)` : ''}`}
              right={`-${money(item.discount)}`}
            />
          )}
        </div>
      ))}
      <Divider />

      <Row left="Subtotal" right={money(sale.subtotal)} />
      {sale.billDiscount > 0 && (
        <Row
          left={`Bill discount${sale.billDiscountType === 'percent' ? ` (${sale.billDiscountValue}%)` : ''}`}
          right={`-${money(sale.billDiscount)}`}
        />
      )}
      {sale.discountTotal > 0 && <Row left="Total discount" right={`-${money(sale.discountTotal)}`} />}
      <Row strong left="TOTAL" right={money(sale.total)} />
      <Divider />

      <Row left="Payment:" right={PAYMENT_LABELS[sale.paymentMethod]} />
      {/* List each part for split payments, or show a transfer/POS reference */}
      {paymentLines(sale)
        .filter((p) => sale.paymentMethod === 'split' || p.reference)
        .map((p) => (
          <Row key={p.label} indent left={p.reference ? `${p.label} (${p.reference})` : p.label} right={money(p.amount)} />
        ))}
      <Row left="Amount paid" right={money(sale.amountTendered)} />
      <Row left="Change" right={money(sale.change)} />
      {sale.refundedTotal > 0 && <Row left="Refunded later" right={`-${money(sale.refundedTotal)}`} />}
      <Divider />

      <div className="receipt-barcode">
        <BarcodeSvg value={sale.receiptNumber} height={40} width={1.3} fontSize={11} />
        <div className="receipt-small">Scan this barcode for returns</div>
      </div>
    </ReceiptFrame>
  );
}

export default SaleReceipt;
