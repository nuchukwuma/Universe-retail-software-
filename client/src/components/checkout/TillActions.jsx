import { History, Pause, Percent, Search, Undo2, X } from 'lucide-react';

// The till's other buttons. Each shows its keyboard shortcut.
function TillActions({ hasItems, actions }) {
  const buttons = [
    { label: 'Find', key: 'F2', icon: Search, onClick: actions.onFind },
    { label: 'Discount', key: 'F8', icon: Percent, onClick: actions.onDiscount, needsItems: true },
    { label: 'Hold', key: 'F6', icon: Pause, onClick: actions.onHold, needsItems: true },
    { label: 'Recall', key: 'F7', icon: History, onClick: actions.onRecall },
    { label: 'Return', icon: Undo2, onClick: actions.onReturn },
    { label: 'Cancel', key: 'F9', icon: X, onClick: actions.onCancel, needsItems: true, danger: true },
  ];
  return (
    <section className="till-actions" aria-label="Till actions">
      {buttons.map(({ label, key, icon: Icon, onClick, needsItems, danger }) => (
        <button
          key={label}
          type="button"
          className={danger ? 'till-action btn-danger' : 'till-action'}
          onClick={onClick}
          disabled={needsItems && !hasItems}
          aria-keyshortcuts={key}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          {key && <span className="till-action-key">{key}</span>}
        </button>
      ))}
    </section>
  );
}

export default TillActions;
