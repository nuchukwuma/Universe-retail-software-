import { formatNaira } from '../../utils/formatNaira';

// Small building blocks shared by every printed slip (sale receipt,
// return receipt, end-of-day report, test receipt).

// Returns the CSS class for the paper width.
export function paperClass(paper) {
  return { '58mm': 'receipt-58', '80mm': 'receipt-80', A4: 'receipt-a4' }[paper] || 'receipt-80';
}

// A dashed line across the receipt.
export function Divider() {
  return <div className="receipt-divider" />;
}

// One line with text on the left and (optionally) an amount on the right.
export function Row({ left, right, strong = false, indent = false }) {
  const classes = ['receipt-row', strong && 'receipt-row-strong', indent && 'receipt-row-indent'].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <span>{left}</span>
      {right !== undefined && <span>{right}</span>}
    </div>
  );
}

// Formats money for receipts, e.g. 12500 -> "₦12,500".
export function money(amount) {
  return formatNaira(amount);
}

// The top and bottom of every slip: store details and footer (text only).
// "title" (e.g. RETURN RECEIPT) and "duplicate" are shown under the header.
export function ReceiptFrame({ settings, paper, title, duplicate, footer, children }) {
  return (
    <div className={`receipt ${paperClass(paper || settings.paperSize)}`}>
      <div className="receipt-store">{settings.storeName}</div>
      {settings.address && <div className="receipt-center">{settings.address}</div>}
      {settings.phone && <div className="receipt-center">Tel: {settings.phone}</div>}
      {title && <div className="receipt-title">{title}</div>}
      {duplicate && <div className="receipt-duplicate">*** DUPLICATE COPY ***</div>}
      <Divider />
      {children}
      {footer && <div className="receipt-footer">{footer}</div>}
    </div>
  );
}
