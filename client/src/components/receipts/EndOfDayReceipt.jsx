import { ReceiptFrame, Divider, Row, money } from './ReceiptParts';
import { formatDate, formatDateTime } from '../../utils/dates';

// Shows money taken away as "-₦500", but zero simply as "₦0".
function minus(amount) {
  return amount > 0 ? `-${money(amount)}` : money(0);
}

// The printed end-of-day summary, signed by the cashier and a manager.
function EndOfDayReceipt({ report, settings, paper }) {
  return (
    <ReceiptFrame settings={settings} paper={paper} title="END OF DAY">
      <Row left="Date:" right={formatDate(report.date)} />
      <Row left="Cashier:" right={report.cashierName} />
      <Row left="Printed:" right={formatDateTime(report.generatedAt)} />
      {report.firstReceipt && <Row left="Receipts:" right={`${report.firstReceipt} to ${report.lastReceipt}`} />}
      <Divider />

      <Row left="Number of sales" right={report.salesCount} />
      <Row left="Items sold" right={report.itemsSold} />
      <Row left="Sales before discount" right={money(report.grossSales)} />
      <Row left="Discounts" right={minus(report.discounts)} />
      <Row left="Sales" right={money(report.netSales)} />
      <Row left={`Refunds (${report.returnsCount})`} right={minus(report.refunds)} />
      <Row strong left="TAKINGS" right={money(report.takings)} />
      <Divider />

      <div className="receipt-sign">Cashier signature: ____________</div>
      <div className="receipt-sign">Manager signature: ____________</div>
    </ReceiptFrame>
  );
}

export default EndOfDayReceipt;
