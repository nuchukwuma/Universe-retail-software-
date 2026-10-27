import { useEffect, useRef } from 'react';
import { formatNaira } from '../../utils/formatNaira';
import { lineDiscount } from '../../utils/billMath';

// One line on the bill: name, unit price, quantity with + and -, and delete.
// "stock" is how many the system has; we warn if the bill wants more.
// "highlight" briefly colours the row that was just added.
function BillItemRow({ item, stock, highlight, onChangeQuantity, onSetQuantity, onRemove }) {
  const rowRef = useRef(null);

  // Scroll the just-added row into view so the cashier can see it.
  useEffect(() => {
    if (highlight) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [highlight, item.quantity]);

  const notEnoughStock = stock !== undefined && item.quantity > stock;
  const discount = lineDiscount(item);

  return (
    <li ref={rowRef} className={highlight ? 'bill-row bill-row-new' : 'bill-row'}>
      <div className="bill-row-info">
        <strong>{item.name}</strong>
        <span className="muted small">
          {formatNaira(item.unitPrice)} each
          {notEnoughStock && <span className="text-error"> · only {Math.max(stock, 0)} in stock</span>}
        </span>
        {discount > 0 && (
          <span className="bill-row-discount">
            🏷️ -{formatNaira(discount)}{item.discountType === 'percent' && ` (${item.discountValue}%)`}
          </span>
        )}
      </div>

      <div className="qty-control">
        <button type="button" className="btn btn-small" onClick={() => onChangeQuantity(item.productId, -1)} aria-label="Less">
          −
        </button>
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onSetQuantity(item.productId, e.target.value)}
          aria-label={`Quantity of ${item.name}`}
        />
        <button type="button" className="btn btn-small" onClick={() => onChangeQuantity(item.productId, 1)} aria-label="More">
          +
        </button>
      </div>

      <strong className="bill-row-total">{formatNaira(item.unitPrice * item.quantity - discount)}</strong>

      <button type="button" className="bill-row-delete" onClick={() => onRemove(item.productId)} aria-label={`Remove ${item.name}`}>
        🗑
      </button>
    </li>
  );
}

export default BillItemRow;
