import { useEffect, useRef } from 'react';
import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { formatNaira } from '../../utils/formatNaira';
import { lineDiscount } from '../../utils/billMath';

// One line on the bill: name, price each, quantity with - and +, amount,
// and remove. "stock" is how many the shop has; a warning shows if the
// bill wants more.
function BillLine({ item, stock, justScanned, onChangeQuantity, onSetQuantity, onRemove }) {
  const rowRef = useRef(null);

  // Keep the just-added line in view, even on a long bill.
  useEffect(() => {
    if (justScanned) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [justScanned, item.quantity]);

  const discount = lineDiscount(item);
  const notEnoughStock = stock !== undefined && item.quantity > stock;

  return (
    <li ref={rowRef} className={justScanned ? 'bill-line is-just-scanned' : 'bill-line'}>
      <div className="bill-line-main">
        <span className="bill-item-name">{item.name}</span>
        <span className="bill-item-note muted">{formatNaira(item.unitPrice)}</span>
        {discount > 0 && (
          <span className="bill-item-note success-text">
            {item.discountType === 'percent' ? `${item.discountValue}% off, ` : ''}minus {formatNaira(discount)}
          </span>
        )}
        {notEnoughStock && <span className="bill-item-note warning-text strong">Only {Math.max(stock, 0)} in stock</span>}
      </div>
      <div className="qty">
        <button type="button" className="btn" onClick={() => onChangeQuantity(item.productId, -1)} aria-label={`One less ${item.name}`}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onSetQuantity(item.productId, e.target.value)}
          aria-label={`Quantity of ${item.name}`}
        />
        <button type="button" className="btn" onClick={() => onChangeQuantity(item.productId, 1)} aria-label={`One more ${item.name}`}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <span className="num bill-amount">{formatNaira(item.unitPrice * item.quantity - discount)}</span>
      <button type="button" className="icon-btn bill-remove" onClick={() => onRemove(item.productId)} aria-label={`Remove ${item.name}`}>
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

// The lines of the bill. The line just added is highlighted.
function BillTable({ billState, productsById, lastAddedId }) {
  const { bill, changeQuantity, setQuantity, removeItem } = billState;

  if (bill.items.length === 0) {
    return (
      <div className="bill-empty">
        <ShoppingBasket size={40} strokeWidth={1.4} aria-hidden="true" />
        <p>No items</p>
      </div>
    );
  }

  return (
    <ul className="bill-list" aria-label="Items on the bill">
      {bill.items.map((item) => (
        <BillLine
          key={item.productId}
          item={item}
          stock={productsById[item.productId]?.quantity}
          justScanned={item.productId === lastAddedId}
          onChangeQuantity={changeQuantity}
          onSetQuantity={setQuantity}
          onRemove={removeItem}
        />
      ))}
    </ul>
  );
}

export default BillTable;
