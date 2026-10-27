import { formatNaira } from '../../utils/formatNaira';
import { PAYMENT_LABELS, roundMoney } from '../../utils/billMath';

// Boxes for paying part by cash, part by transfer and part by card.
// "split" looks like { cash: '5000', transfer: '', card: '' }.
function SplitPaymentFields({ split, onChange, total }) {
  const paidSoFar = Object.values(split).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const remaining = roundMoney(total - paidSoFar);

  // Puts whatever is still owed into one box.
  function fillRemaining(method) {
    const current = Number(split[method]) || 0;
    onChange({ ...split, [method]: String(roundMoney(current + Math.max(remaining, 0))) });
  }

  return (
    <div className="payment-fields split-fields">
      {['cash', 'transfer', 'card'].map((method, index) => (
        <div key={method} className="split-row">
          <label>
            {PAYMENT_LABELS[method]} (₦)
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={split[method]}
              onChange={(e) => onChange({ ...split, [method]: e.target.value })}
              autoFocus={index === 0}
            />
          </label>
          <button type="button" className="btn btn-small" onClick={() => fillRemaining(method)} disabled={remaining <= 0}>
            + Rest
          </button>
        </div>
      ))}
      <p className="muted small">
        {remaining > 0 ? `Still to pay: ${formatNaira(remaining)}` : 'Fully paid.'} Only cash can be more than the bill (for change).
      </p>
    </div>
  );
}

export default SplitPaymentFields;
