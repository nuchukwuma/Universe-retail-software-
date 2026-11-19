import { Plus, X } from 'lucide-react';
import { formatNaira } from '../../utils/formatNaira';
import { billTotals } from '../../utils/billMath';

// The open bills across the top of the till, one tab each. A click serves
// that bill; the x closes it; + opens a new one (F6).
function BillTabs({ bills, activeIndex, onSwitch, onClose, onNew, canAddMore }) {
  return (
    <div className="bill-tabs" role="tablist" aria-label="Open bills">
      {bills.map((b, index) => {
        const totals = billTotals(b.items, b.discount);
        const name = b.label || b.customer?.name || `Bill ${index + 1}`;
        const selected = index === activeIndex;
        return (
          <span key={b.id} className="bill-tab-wrap">
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              className="bill-tab"
              onClick={() => onSwitch(index)}
              title={name}
            >
              <span className="bill-tab-name">{name}</span>
              <span className="bill-tab-sub">
                {b.items.length === 0 ? 'Empty' : formatNaira(totals.total)}
              </span>
            </button>
            {(bills.length > 1 || b.items.length > 0) && (
              <button type="button" className="bill-tab-delete" onClick={() => onClose(index)} aria-label={`Close ${name}`} title="Close">
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </span>
        );
      })}
      <button type="button" className="bill-tab-new" onClick={onNew} disabled={!canAddMore} aria-label="New bill" title="New bill (F6)">
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export default BillTabs;
