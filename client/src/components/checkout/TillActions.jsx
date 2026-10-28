// The till's other buttons, in the order a cashier reaches for them.
// Each one says its keyboard shortcut.
function TillActions({ hasItems, actions }) {
  return (
    <section className="till-actions" aria-label="Till actions">
      <button type="button" className="btn span-all" onClick={actions.onFind}>
        Find product <span className="key">F2</span>
      </button>
      <button type="button" className="btn" onClick={actions.onCustomer}>
        Customer <span className="key">F3</span>
      </button>
      <button type="button" className="btn" onClick={actions.onDiscount} disabled={!hasItems}>
        Discount <span className="key">F8</span>
      </button>
      <button type="button" className="btn" onClick={actions.onHold} disabled={!hasItems}>
        Hold bill <span className="key">F6</span>
      </button>
      <button type="button" className="btn" onClick={actions.onRecall}>
        Recall bill <span className="key">F7</span>
      </button>
      <button type="button" className="btn" onClick={actions.onReturn}>
        Return
      </button>
      <button type="button" className="btn" onClick={actions.onFeedback}>
        Feedback
      </button>
      <button type="button" className="btn btn-danger span-all" onClick={actions.onCancel} disabled={!hasItems}>
        Cancel bill <span className="key">F9</span>
      </button>
    </section>
  );
}

export default TillActions;
