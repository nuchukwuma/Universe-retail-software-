import { useState } from 'react';
import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';
import { checkPaymentParts, PAYMENT_LABELS, quickCashAmounts } from '../../utils/billMath';
import SplitPaymentFields from './SplitPaymentFields';

const METHODS = ['cash', 'transfer', 'card', 'split'];

// Builds the list of payment parts from what the cashier entered.
function buildPayments(method, { cashReceived, reference, split, total }) {
  if (method === 'cash') {
    return [{ method: 'cash', amount: Number(cashReceived) || 0 }];
  }
  if (method === 'transfer' || method === 'card') {
    return [{ method, amount: total, reference }];
  }
  return ['cash', 'transfer', 'card']
    .map((m) => ({ method: m, amount: Number(split[m]) || 0 }))
    .filter((p) => p.amount > 0);
}

// The payment box: choose Cash, Bank Transfer, Card (POS) or Split,
// enter the amount and complete the sale.
function PaymentModal({ total, saving, error, onConfirm, onClose }) {
  const [method, setMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [split, setSplit] = useState({ cash: '', transfer: '', card: '' });

  const payments = buildPayments(method, { cashReceived, reference, split, total });
  const { paid, change, problem } = checkPaymentParts(payments, total);

  // Runs when "Complete Sale" is pressed (or Enter in any box).
  function handleSubmit(event) {
    event.preventDefault();
    if (!problem && !saving) onConfirm(payments);
  }

  return (
    <Modal title="Payment" onClose={saving ? () => {} : onClose} wide>
      <form onSubmit={handleSubmit} className="payment-form">
        <div className="payment-total">
          <span>Amount to pay</span>
          <strong>{formatNaira(total)}</strong>
        </div>

        <div className="payment-methods" role="tablist">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              className={method === m ? 'payment-method active' : 'payment-method'}
              onClick={() => setMethod(m)}
            >
              {{ cash: '💵', transfer: '🏦', card: '💳', split: '➗' }[m]} {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>

        {method === 'cash' && (
          <div className="payment-fields">
            <label>
              Amount received (₦)
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                autoFocus
                className="big-input"
              />
            </label>
            <div className="quick-amounts">
              {quickCashAmounts(total).map((amount) => (
                <button key={amount} type="button" className="btn" onClick={() => setCashReceived(String(amount))}>
                  {amount === total ? 'Exact' : formatNaira(amount)}
                </button>
              ))}
            </div>
          </div>
        )}

        {(method === 'transfer' || method === 'card') && (
          <div className="payment-fields">
            <p>
              {method === 'transfer'
                ? 'Confirm the transfer has arrived in the shop account before completing the sale.'
                : 'Charge the customer on the POS terminal, then complete the sale when it is approved.'}
            </p>
            <label>
              {method === 'transfer' ? 'Transfer reference / sender name (optional)' : 'POS slip number (optional)'}
              <input value={reference} onChange={(e) => setReference(e.target.value)} autoFocus />
            </label>
          </div>
        )}

        {method === 'split' && <SplitPaymentFields split={split} onChange={setSplit} total={total} />}

        <div className="payment-result">
          <div>
            <span>Paid</span>
            <strong>{formatNaira(paid)}</strong>
          </div>
          <div className={change > 0 ? 'payment-change' : ''}>
            <span>Change</span>
            <strong>{formatNaira(change)}</strong>
          </div>
        </div>

        {problem && <div className="alert alert-error">{problem}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block pay-confirm" disabled={Boolean(problem) || saving}>
          {saving ? 'Saving sale...' : `Complete Sale (Enter)`}
        </button>
      </form>
    </Modal>
  );
}

export default PaymentModal;
