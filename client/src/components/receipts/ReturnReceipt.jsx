import { ReceiptFrame, Divider, Row, money } from './ReceiptParts';
import { PAYMENT_LABELS } from '../../utils/billMath';
import { formatDateTime } from '../../utils/dates';

// The printed slip for a return / refund.
function ReturnReceipt({ ret, settings, paper, duplicate = false }) {
  return (
    <ReceiptFrame
      settings={settings}
      paper={paper}
      title="RETURN / REFUND"
      duplicate={duplicate}
      footer="Please keep this slip for your records."
    >
      <Row left="Return No:" right={ret.returnNumber} />
      <Row left="Original receipt:" right={ret.receiptNumber} />
      <Row left="Date:" right={formatDateTime(ret.createdAt)} />
      <Row left="Processed by:" right={ret.processedByName} />
      {ret.approvedByName && ret.approvedByName !== ret.processedByName && (
        <Row left="Approved by:" right={ret.approvedByName} />
      )}
      {ret.customerName && <Row left="Customer:" right={ret.customerName} />}
      <Divider />

      <div className="receipt-small">ITEMS RETURNED</div>
      {ret.items.map((item) => (
        <div key={item.lineIndex} className="receipt-item">
          <div className="receipt-item-name">{item.name}</div>
          <Row indent left={`${item.quantity} x ${money(item.refundPerItem)}`} right={money(item.refundAmount)} />
        </div>
      ))}
      <Divider />

      <Row strong left="REFUND" right={money(ret.refundTotal)} />
      <Row left="Refunded by:" right={PAYMENT_LABELS[ret.refundMethod]} />
      <div className="receipt-small">Reason: {ret.reason}</div>
      <Divider />
    </ReceiptFrame>
  );
}

export default ReturnReceipt;
