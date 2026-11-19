import { Percent, Plus, Search, Undo2, UserRound, X } from 'lucide-react';

// The till's other buttons. Each shows its keyboard shortcut.
// "loyalty" adds the Customer button (loyalty points switched on).
function TillActions({ hasItems, loyalty, customerName, actions }) {
  const buttons = [
    { label: 'Find', key: 'F2', icon: Search, onClick: actions.onFind },
    { label: 'Discount', key: 'F8', icon: Percent, onClick: actions.onDiscount, needsItems: true },
    { label: 'New bill', key: 'F6', icon: Plus, onClick: actions.onNewBill },
    loyalty && { label: customerName || 'Customer', key: 'F4', icon: UserRound, onClick: actions.onCustomer, active: Boolean(customerName) },
    { label: 'Return', icon: Undo2, onClick: actions.onReturn },
    { label: 'Cancel', key: 'F9', icon: X, onClick: actions.onCancel, needsItems: true, danger: true },
  ].filter(Boolean);
  return (
    <section className="till-actions" aria-label="Till actions">
      {buttons.map(({ label, key, icon: Icon, onClick, needsItems, danger, active }) => (
        <button
          key={key || label}
          type="button"
          className={['till-action', danger && 'btn-danger', active && 'is-active'].filter(Boolean).join(' ')}
          onClick={onClick}
          disabled={needsItems && !hasItems}
          aria-keyshortcuts={key}
          title={label}
        >
          <Icon size={18} aria-hidden="true" />
          <span className="till-action-label">{label}</span>
          {key && <span className="till-action-key">{key}</span>}
        </button>
      ))}
    </section>
  );
}

export default TillActions;
