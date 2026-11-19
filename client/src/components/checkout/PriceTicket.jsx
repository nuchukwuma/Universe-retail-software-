import { formatNaira } from '../../utils/formatNaira';

// The bill's sums, the total in large figures, and Complete sale.
function PriceTicket({ totals, onComplete }) {
  const empty = totals.lineCount === 0;
  const totalText = formatNaira(totals.total);

  return (
    <section className="ticket" aria-label="Bill total">
      <dl className="ticket-lines">
        <dt>Items</dt>
        <dd>{totals.quantityCount}</dd>
        <dt>Subtotal</dt>
        <dd>{formatNaira(totals.subtotal)}</dd>
        {totals.discountTotal - (totals.pointsDiscount || 0) > 0 && (
          <>
            <dt>Discount</dt>
            <dd className="success-text">minus {formatNaira(totals.discountTotal - (totals.pointsDiscount || 0))}</dd>
          </>
        )}
        {totals.pointsDiscount > 0 && (
          <>
            <dt>Points ({totals.pointsUsed})</dt>
            <dd className="success-text">minus {formatNaira(totals.pointsDiscount)}</dd>
          </>
        )}
      </dl>
      <div className="ticket-total-row">
        <span className="ticket-label">Total</span>
        <output className="ticket-total" aria-live="polite" style={{ '--chars': totalText.length }}>{totalText}</output>
      </div>
      <button type="button" className="btn btn-complete" onClick={onComplete} disabled={empty}>
        Complete sale <span className="key">F10</span>
      </button>
    </section>
  );
}

export default PriceTicket;
