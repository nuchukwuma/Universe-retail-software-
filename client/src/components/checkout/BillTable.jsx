import { useEffect, useRef } from 'react';
import { formatNaira } from '../../utils/formatNaira';
import { lineDiscount } from '../../utils/billMath';

// One line on the bill: name, quantity with - and +, amount, Remove.
// "stock" is how many the system has; we warn if the bill wants more.
function BillLine({ item, stock, justScanned, onChangeQuantity, onSetQuantity, onRemove }) {
  const rowRef = useRef(null);

  // Keep the just-scanned line in view, even on a long bill.
  useEffect(() => {
    if (justScanned) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [justScanned, item.quantity]);

  const discount = lineDiscount(item);
  const notEnoughStock = stock !== undefined && item.quantity > stock;

  return (
    <tr ref={rowRef} className={justScanned ? 'is-just-scanned' : undefined}>
      <td>
        <span className="bill-item-name">{item.name}</span>
        <span className="bill-item-note muted">{formatNaira(item.unitPrice)} each</span>
        {discount > 0 && (
          <span className="bill-item-note success-text">
            Discount {item.discountType === 'percent' ? `${item.discountValue}%, ` : ''}minus {formatNaira(discount)}
          </span>
        )}
        {notEnoughStock && (
          <span className="bill-item-note warning-text strong">Only {Math.max(stock, 0)} in stock</span>
        )}
      </td>
      <td>
        <div className="qty">
          <button type="button" className="btn" onClick={() => onChangeQuantity(item.productId, -1)} aria-label={`One less ${item.name}`}>
            -
          </button>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onSetQuantity(item.productId, e.target.value)}
            aria-label={`Quantity of ${item.name}`}
          />
          <button type="button" className="btn" onClick={() => onChangeQuantity(item.productId, 1)} aria-label={`One more ${item.name}`}>
            +
          </button>
        </div>
      </td>
      <td className="num bill-amount">{formatNaira(item.unitPrice * item.quantity - discount)}</td>
      <td className="actions">
        <button type="button" className="btn btn-quiet btn-danger" onClick={() => onRemove(item.productId)}>
          Remove<span className="visually-hidden"> {item.name}</span>
        </button>
      </td>
    </tr>
  );
}

// The bill as a table. The line the scanner just added is highlighted.
function BillTable({ billState, productsById, lastAddedId }) {
  const { bill, changeQuantity, setQuantity, removeItem } = billState;

  if (bill.items.length === 0) {
    return (
      <div className="bill-empty">
        <h2>The bill is empty</h2>
        <p>Scan a barcode to start a sale. For items without a barcode, press F2 to find them by name.</p>
      </div>
    );
  }

  return (
    <table className="table bill-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th className="num">Amount</th>
          <th><span className="visually-hidden">Remove</span></th>
        </tr>
      </thead>
      <tbody>
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
      </tbody>
    </table>
  );
}

export default BillTable;
