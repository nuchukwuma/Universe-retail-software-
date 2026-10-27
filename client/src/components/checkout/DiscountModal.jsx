import { useState } from 'react';
import Modal from '../Modal';
import { ManagerApprovalForm } from './ManagerApprovalForm';
import { formatNaira } from '../../utils/formatNaira';
import { billTotals } from '../../utils/billMath';

// Works out what the bill totals WOULD be with the new discount,
// so the cashier sees the result before applying it.
function previewTotals(bill, target, type, value) {
  if (target === 'bill') {
    return billTotals(bill.items, type ? { type, value } : null);
  }
  const items = bill.items.map((item) =>
    item.productId === target ? { ...item, discountType: type, discountValue: Number(value) || 0 } : item
  );
  return billTotals(items, bill.discount);
}

// Pop-up for giving a discount: percentage or fixed Naira amount, on one
// item or the whole bill. Cashiers going over the allowed % need a manager.
function DiscountModal({ bill, startTarget, maxPercent, needsApprovalCheck, onApply, onClose }) {
  const [target, setTarget] = useState(startTarget || 'bill');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('');
  const [askApproval, setAskApproval] = useState(false);

  const number = Number(value) || 0;
  const valueProblem =
    number <= 0 ? 'Enter a discount above 0.' : type === 'percent' && number > 100 ? 'A percentage cannot be more than 100.' : '';
  const after = previewTotals(bill, target, type, number);
  const isLarge = after.discountPercent > maxPercent + 0.001;

  const targetItem = bill.items.find((item) => item.productId === target);
  const currentHasDiscount = target === 'bill' ? Boolean(bill.discount) : Boolean(targetItem?.discountType);

  // Applies the discount, asking for a manager first if it is too big.
  function handleSubmit(event) {
    event.preventDefault();
    if (valueProblem) return;
    if (needsApprovalCheck && isLarge && !bill.approval) {
      setAskApproval(true);
      return;
    }
    onApply({ target, type, value: number });
  }

  // Removes the discount from the chosen item or the bill.
  function handleRemove() {
    onApply({ target, type: '', value: 0 });
  }

  if (askApproval) {
    return (
      <Modal title="Manager approval needed" onClose={onClose}>
        <ManagerApprovalForm
          reason={`This discount is ${after.discountPercent.toFixed(1)}% of the bill. Cashiers can give up to ${maxPercent}%.`}
          onApproved={(approval) => onApply({ target, type, value: number, approval })}
          onCancel={() => setAskApproval(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal title="Give a discount" onClose={onClose}>
      <form className="discount-form" onSubmit={handleSubmit}>
        <label>
          Discount on
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="bill">The whole bill</option>
            {bill.items.map((item) => (
              <option key={item.productId} value={item.productId}>
                {item.name} ({item.quantity} × {formatNaira(item.unitPrice)})
              </option>
            ))}
          </select>
        </label>

        <div className="discount-type">
          <button type="button" className={type === 'percent' ? 'payment-method active' : 'payment-method'} onClick={() => setType('percent')}>
            Percentage (%)
          </button>
          <button type="button" className={type === 'amount' ? 'payment-method active' : 'payment-method'} onClick={() => setType('amount')}>
            Amount (₦)
          </button>
        </div>

        <label>
          {type === 'percent' ? 'Discount %' : 'Discount in Naira'}
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="big-input"
            autoFocus
          />
        </label>

        <div className="payment-result">
          <div>
            <span>Total discount</span>
            <strong>{formatNaira(after.discountTotal)}</strong>
          </div>
          <div>
            <span>New total</span>
            <strong>{formatNaira(after.total)}</strong>
          </div>
        </div>

        {needsApprovalCheck && isLarge && !valueProblem && (
          <p className="muted small">🔒 Over {maxPercent}% of the bill - a manager must approve.</p>
        )}
        {value !== '' && valueProblem && <div className="alert alert-error">{valueProblem}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={Boolean(valueProblem)}>Apply Discount</button>
          {currentHasDiscount && (
            <button type="button" className="btn btn-danger" onClick={handleRemove}>Remove discount</button>
          )}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default DiscountModal;
