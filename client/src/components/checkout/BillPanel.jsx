import { formatNaira } from '../../utils/formatNaira';
import BillItemRow from './BillItemRow';

// The left panel of the checkout: price type, customer, the bill lines
// and the blue totals block.
function BillPanel({ billState, productsById, lastAddedId, onPickCustomer }) {
  const { bill, totals, setPriceType, setCustomerName, setCustomer, changeQuantity, setQuantity, removeItem } = billState;

  return (
    <section className="bill-panel">
      <div className="bill-header">
        <label>
          Price type
          <select value={bill.priceType} onChange={(e) => setPriceType(e.target.value)}>
            <option value="standard">Standard</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </label>

        <div>
          <span className="field-label">Customer</span>
          <div className="customer-box">
            <input
              value={bill.customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in customer"
              aria-label="Customer name"
            />
            {bill.customer && (
              <button type="button" className="btn btn-icon" onClick={() => setCustomer(null)} title="Remove customer">
                ✕
              </button>
            )}
            <button type="button" className="btn btn-icon" onClick={onPickCustomer} title="Pick or add customer (F3)">
              👤
            </button>
          </div>
          {bill.customer?.phone && <small className="muted">Saved customer · {bill.customer.phone}</small>}
        </div>
      </div>

      <ul className="bill-items">
        {bill.items.length === 0 && (
          <li className="bill-empty">
            <span>🛒</span>
            Scan a barcode or tap a product to start a sale.
          </li>
        )}
        {bill.items.map((item) => (
          <BillItemRow
            key={item.productId}
            item={item}
            stock={productsById[item.productId]?.quantity}
            highlight={item.productId === lastAddedId}
            onChangeQuantity={changeQuantity}
            onSetQuantity={setQuantity}
            onRemove={removeItem}
          />
        ))}
      </ul>

      <div className="bill-summary">
        <div>
          <span>Total Items / Quantity</span>
          <strong>{totals.lineCount} / {totals.quantityCount}</strong>
        </div>
        <div>
          <span>Total Discount</span>
          <strong>{formatNaira(totals.discountTotal)}</strong>
        </div>
        <div className="bill-summary-total">
          <span>Total Amount</span>
          <strong>{formatNaira(totals.total)}</strong>
        </div>
      </div>
    </section>
  );
}

export default BillPanel;
