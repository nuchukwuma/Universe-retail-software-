import { formatNaira } from '../../utils/formatNaira';

// The bill total, set like a shelf price ticket so it can be read from
// across the counter, with the Complete sale button underneath.
function PriceTicket({ totals, onComplete }) {
  const empty = totals.lineCount === 0;
  const totalText = formatNaira(totals.total);

  return (
    <section className="ticket" aria-label="Bill total">
      <span className="ticket-label">Total</span>
      <output className="ticket-total" aria-live="polite" style={{ '--chars': totalText.length }}>{totalText}</output>
      <dl className="ticket-lines">
        <dt>Items</dt>
        <dd>{totals.quantityCount}</dd>
        <dt>Before discount</dt>
        <dd>{formatNaira(totals.subtotal)}</dd>
        {totals.discountTotal > 0 && (
          <>
            <dt>Discount</dt>
            <dd>minus {formatNaira(totals.discountTotal)}</dd>
          </>
        )}
      </dl>
      <button type="button" className="btn btn-complete" onClick={onComplete} disabled={empty}>
        Complete sale <span className="key">F10</span>
      </button>
    </section>
  );
}

export default PriceTicket;
