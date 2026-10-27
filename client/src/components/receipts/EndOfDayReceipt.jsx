import { ReceiptFrame, Divider, Row, money } from './ReceiptParts';
import { PAYMENT_LABELS } from '../../utils/billMath';
import { formatDate, formatDateTime } from '../../utils/dates';

const METHODS = ['cash', 'transfer', 'card'];

// Shows money taken away as "-₦500", but zero simply as "₦0".
function minus(amount) {
  return amount > 0 ? `-${money(amount)}` : money(0);
}

// The printed end-of-day summary used to balance the till.
// "countedCash" is what the cashier counted in the drawer (optional).
function EndOfDayReceipt({ report, settings, paper, countedCash }) {
  const hasCount = countedCash !== '' && countedCash !== undefined && countedCash !== null;
  const difference = hasCount ? Number(countedCash) - report.expectedCash : 0;

  return (
    <ReceiptFrame settings={settings} paper={paper} title="END OF DAY REPORT">
      <Row left="Date:" right={formatDate(report.date)} />
      <Row left="Cashier:" right={report.cashierName} />
      <Row left="Printed:" right={formatDateTime(report.generatedAt)} />
      {report.firstReceipt && <Row left="Receipts:" right={`${report.firstReceipt} to ${report.lastReceipt}`} />}
      <Divider />

      <Row left="Number of sales" right={report.salesCount} />
      <Row left="Items sold" right={report.itemsSold} />
      <Row left="Gross sales" right={money(report.grossSales)} />
      <Row left="Discounts" right={minus(report.discounts)} />
      <Row strong left="NET SALES" right={money(report.netSales)} />
      <Divider />

      <div className="receipt-small">SALES BY PAYMENT METHOD</div>
      {METHODS.map((m) => <Row key={m} indent left={PAYMENT_LABELS[m]} right={money(report.salesByMethod[m])} />)}

      <div className="receipt-small">REFUNDS ({report.returnsCount})</div>
      {METHODS.map((m) => <Row key={m} indent left={PAYMENT_LABELS[m]} right={minus(report.refundsByMethod[m])} />)}

      <div className="receipt-small">NET BY PAYMENT METHOD</div>
      {METHODS.map((m) => <Row key={m} indent left={PAYMENT_LABELS[m]} right={money(report.netByMethod[m])} />)}
      <Divider />

      <Row strong left="CASH EXPECTED" right={money(report.expectedCash)} />
      {hasCount && (
        <>
          <Row left="Cash counted" right={money(Number(countedCash))} />
          <Row strong left={difference === 0 ? 'BALANCED' : difference > 0 ? 'OVER' : 'SHORT'} right={money(Math.abs(difference))} />
        </>
      )}
      <Divider />

      <div className="receipt-sign">Cashier signature: ____________</div>
      <div className="receipt-sign">Manager signature: ____________</div>
    </ReceiptFrame>
  );
}

export default EndOfDayReceipt;
