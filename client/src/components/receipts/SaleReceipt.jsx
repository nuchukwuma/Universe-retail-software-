import BarcodeSvg from '../BarcodeSvg';
import { ReceiptFrame, Divider, Row, money } from './ReceiptParts';
import { formatDateTime } from '../../utils/dates';

// The printed receipt for a sale. Works for 58mm, 80mm and A4 paper.
function SaleReceipt({ sale, settings, paper, duplicate = false }) {
  return (
    <ReceiptFrame settings={settings} paper={paper} duplicate={duplicate} footer={settings.footerMessage}>
      <Row left="Receipt No:" right={sale.receiptNumber} />
      <Row left="Date:" right={formatDateTime(sale.createdAt)} />
      <Row left="Cashier:" right={sale.cashierName} />
      {sale.customerName && <Row left="Customer:" right={sale.customerName} />}
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

      {sale.refundedTotal > 0 && (
        <>
          <Row left="Refunded later" right={`-${money(sale.refundedTotal)}`} />
          <Divider />
        </>
      )}

      <div className="receipt-barcode">
        <BarcodeSvg value={sale.receiptNumber} height={40} width={1.3} fontSize={11} />
        <div className="receipt-small">Scan this barcode for returns</div>
      </div>
    </ReceiptFrame>
  );
}

export default SaleReceipt;
