import { formatNaira } from '../../utils/formatNaira';

// The row of big buttons at the bottom of the checkout.
// "actions" has a function for each button, e.g. { onPay, onCancel, ... }.
function ActionBar({ total, hasItems, actions }) {
  return (
    <footer className="action-bar">
      <div className="action-buttons">
        <button type="button" className="action-button" onClick={actions.onFeedback}>💬<span>Feedback</span></button>
        <button type="button" className="action-button" onClick={actions.onRecall}>📂<span>Recall</span></button>
        <button type="button" className="action-button" onClick={actions.onReturn}>↩️<span>Return</span></button>
        <button type="button" className="action-button" onClick={actions.onCancel} disabled={!hasItems}>✖️<span>Cancel</span></button>
        <button type="button" className="action-button" onClick={actions.onHold} disabled={!hasItems}>⏸️<span>Hold</span></button>
        <button type="button" className="action-button" onClick={actions.onDiscount} disabled={!hasItems}>🏷️<span>Discount</span></button>
      </div>
      <button type="button" className="pay-button" onClick={actions.onPay} disabled={!hasItems}>
        <span>Pay</span>
        <strong>{formatNaira(total)}</strong>
      </button>
    </footer>
  );
}

export default ActionBar;
