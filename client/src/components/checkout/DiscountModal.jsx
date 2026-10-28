import { useId, useState } from 'react';
import Modal from '../Modal';
import { ManagerApprovalModal } from './ManagerApprovalForm';
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

// Give a discount: a percentage or a Naira amount, on one item or the
// whole bill. Cashiers going over the allowed % need a manager.
function DiscountModal({ bill, startTarget, maxPercent, needsApprovalCheck, onApply, onClose }) {
  const formId = useId();
  const [target, setTarget] = useState(startTarget || 'bill');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('');
  const [askApproval, setAskApproval] = useState(false);

  const number = Number(value) || 0;
  let valueProblem = '';
  if (number <= 0) valueProblem = 'Enter a discount above 0.';
  else if (type === 'percent' && number > 100) valueProblem = 'A percentage cannot be more than 100.';
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

  if (askApproval) {
    return (
      <ManagerApprovalModal
        reason={`This discount is ${after.discountPercent.toFixed(1)}% of the bill. Cashiers can give up to ${maxPercent}% on their own.`}
        onApproved={(approval) => onApply({ target, type, value: number, approval })}
        onClose={() => setAskApproval(false)}
      />
    );
  }

  return (
    <Modal
      title="Discount"
      onClose={onClose}
      footer={
        <>
          {currentHasDiscount && (
            <button type="button" className="btn btn-danger push-left" onClick={() => onApply({ target, type: '', value: 0 })}>
              Remove discount
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={Boolean(valueProblem)}>Apply discount</button>
        </>
      }
    >
      <form id={formId} className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-target`}>Discount on</label>
          <select id={`${formId}-target`} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="bill">The whole bill</option>
            {bill.items.map((item) => (
              <option key={item.productId} value={item.productId}>
                {item.name}, {item.quantity} at {formatNaira(item.unitPrice)}
              </option>
            ))}
          </select>
        </div>

        <div className="choices" role="group" aria-label="Kind of discount">
          <button type="button" className="choice" aria-pressed={type === 'percent'} onClick={() => setType('percent')}>
            Percentage
          </button>
          <button type="button" className="choice" aria-pressed={type === 'amount'} onClick={() => setType('amount')}>
            Naira amount
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${formId}-value`}>{type === 'percent' ? 'Discount (%)' : 'Discount (₦)'}</label>
          <input
            id={`${formId}-value`}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          {value !== '' && valueProblem && <span className="field-error">{valueProblem}</span>}
        </div>

        <dl className="facts">
          <dt>Total discount</dt>
          <dd>{formatNaira(after.discountTotal)}</dd>
          <dt>New total</dt>
          <dd>{formatNaira(after.total)}</dd>
        </dl>

        {needsApprovalCheck && isLarge && !valueProblem && (
          <p className="warning-text strong">This is more than {maxPercent}% of the bill, so a manager must approve it.</p>
        )}
      </form>
    </Modal>
  );
}

export default DiscountModal;
