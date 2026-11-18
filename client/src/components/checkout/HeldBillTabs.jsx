import { X } from 'lucide-react';
import { formatNaira } from '../../utils/formatNaira';

// Bills across the top of the till: the one being served, then every
// bill on hold. A click on a held bill switches to it (the current bill,
// if it has items, goes on hold in its place).
function HeldBillTabs({ heldBills, currentLabel, currentCount, onSwitch, onDelete }) {
  return (
    <div className="bill-tabs" role="tablist" aria-label="Bills">
      <button type="button" role="tab" aria-selected="true" className="bill-tab">
        <span className="bill-tab-name">{currentLabel || 'Current'}</span>
        <span className="bill-tab-sub">{currentCount} {currentCount === 1 ? 'item' : 'items'}</span>
      </button>
      {heldBills.map((held) => (
        <span key={held._id} className="bill-tab-wrap">
          <button type="button" role="tab" aria-selected="false" className="bill-tab" onClick={() => onSwitch(held)}>
            <span className="bill-tab-name">{held.label || 'Held bill'}</span>
            <span className="bill-tab-sub">{formatNaira(held.total)}</span>
          </button>
          <button type="button" className="bill-tab-delete" onClick={() => onDelete(held)} aria-label={`Delete held bill ${held.label || ''}`}>
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default HeldBillTabs;
