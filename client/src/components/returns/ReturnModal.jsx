import { useState } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../Modal';
import BarcodeInput from '../BarcodeInput';
import { ManagerApprovalForm } from '../checkout/ManagerApprovalForm';
import { formatNaira } from '../../utils/formatNaira';
import { formatDateTime } from '../../utils/dates';
import { PAYMENT_LABELS, roundMoney } from '../../utils/billMath';
import { canUseBackOffice } from '../../utils/roles';

// What the customer really paid for ONE of a sale line, after all
// discounts, in whole Naira (same sum as the server).
function refundPerItem(sale, item) {
  const linesTotal = sale.items.reduce((sum, line) => sum + line.lineTotal, 0);
  const share = linesTotal > 0 ? sale.total / linesTotal : 0;
  return Math.round((item.lineTotal / item.quantity) * share);
}

// Refund the same way they paid, or cash if they split the payment.
function defaultRefundMethod(sale) {
  return sale.paymentMethod === 'split' ? 'cash' : sale.paymentMethod;
}

// The Return pop-up:
// 1. find the sale (type or scan the receipt barcode)
// 2. choose what comes back, how to refund and why
// 3. a manager approves (if a cashier is doing it)
// Calls onDone({ return, sale }) when the return is saved.
function ReturnModal({ initialSale = null, onDone, onClose }) {
  const { user } = useAuth();
  const [receiptNumber, setReceiptNumber] = useState('');
  const [sale, setSale] = useState(initialSale);
  const [quantities, setQuantities] = useState({}); // { lineIndex: quantity }
  const [refundMethod, setRefundMethod] = useState(initialSale ? defaultRefundMethod(initialSale) : 'cash');
  const [reason, setReason] = useState('');
  const [askApproval, setAskApproval] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  // Looks up a sale by receipt number (typed or scanned).
  async function findSale(number) {
    setError('');
    setWorking(true);
    try {
      const found = await api.get(`/sales/by-receipt/${encodeURIComponent(number.trim())}`);
      setSale(found);
      setRefundMethod(defaultRefundMethod(found));
      setQuantities({});
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  // Sets how many of one line are coming back (0 to what is left).
  function setQuantity(index, value, max) {
    const quantity = Math.min(max, Math.max(0, Math.floor(Number(value)) || 0));
    setQuantities({ ...quantities, [index]: quantity });
  }

  // Ticks every item that has not been returned yet.
  function returnEverything() {
    const all = {};
    sale.items.forEach((item, index) => {
      all[index] = item.quantity - (item.returnedQuantity || 0);
    });
    setQuantities(all);
  }

  // Sends the return to the server (with a manager's approval token if needed).
  async function saveReturn(approvalToken) {
    setWorking(true);
    setError('');
    try {
      const items = Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([lineIndex, quantity]) => ({ lineIndex: Number(lineIndex), quantity }));
      const result = await api.post('/returns', { saleId: sale._id, items, refundMethod, reason, approvalToken });
      onDone(result);
    } catch (err) {
      setError(err.message);
      setAskApproval(false);
      setWorking(false);
    }
  }

  // Runs when "Complete Return" is pressed.
  function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Enter the reason for the return.');
      return;
    }
    if (canUseBackOffice(user)) {
      saveReturn();
    } else {
      setAskApproval(true);
    }
  }

  // Never more than what is left of what the customer paid.
  const refundTotal = sale
    ? Math.min(
      roundMoney(sale.items.reduce((sum, item, index) => sum + refundPerItem(sale, item) * (quantities[index] || 0), 0)),
      roundMoney(sale.total - (sale.refundedTotal || 0))
    )
    : 0;

  // ----- Step 3: manager approval -----
  if (askApproval) {
    return (
      <Modal title="Manager approval needed" onClose={onClose}>
        <ManagerApprovalForm
          reason={`Approve a refund of ${formatNaira(refundTotal)} on receipt ${sale.receiptNumber}.`}
          onApproved={(approval) => saveReturn(approval.token)}
          onCancel={() => setAskApproval(false)}
        />
      </Modal>
    );
  }

  // ----- Step 1: find the sale -----
  if (!sale) {
    return (
      <Modal title="Return items" onClose={onClose}>
        <p className="muted">Scan the barcode on the customer's receipt, or type the receipt number.</p>
        <BarcodeInput
          value={receiptNumber}
          onChange={setReceiptNumber}
          onEnter={findSale}
          placeholder="e.g. 261027-0001"
          autoFocus
        />
        {error && <div className="alert alert-error top-gap">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => findSale(receiptNumber)} disabled={!receiptNumber.trim() || working}>
            {working ? 'Looking...' : 'Find Sale'}
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </Modal>
    );
  }

  // ----- Step 2: choose items -----
  const nothingLeft = sale.items.every((item) => item.quantity - (item.returnedQuantity || 0) <= 0);

  return (
    <Modal title={`Return from receipt ${sale.receiptNumber}`} onClose={onClose} wide>
      <p className="muted small">
        Sold {formatDateTime(sale.createdAt)} by {sale.cashierName}
        {sale.customerName && ` to ${sale.customerName}`} · Paid {formatNaira(sale.total)} ({PAYMENT_LABELS[sale.paymentMethod]})
      </p>

      {nothingLeft ? (
        <div className="alert alert-error">Everything on this receipt has already been returned.</div>
      ) : (
        <form onSubmit={handleSubmit} className="return-form">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="number">Bought</th>
                  <th className="number">Refund each</th>
                  <th className="number">Return</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => {
                  const left = item.quantity - (item.returnedQuantity || 0);
                  return (
                    <tr key={index}>
                      <td>
                        {item.name}
                        {item.returnedQuantity > 0 && <div className="muted small">{item.returnedQuantity} already returned</div>}
                      </td>
                      <td className="number">{item.quantity}</td>
                      <td className="number">{formatNaira(refundPerItem(sale, item))}</td>
                      <td className="number">
                        <input
                          type="number"
                          min="0"
                          max={left}
                          className="copies-input"
                          value={quantities[index] || 0}
                          onChange={(e) => setQuantity(index, e.target.value, left)}
                          disabled={left <= 0}
                          aria-label={`Return quantity for ${item.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-small" onClick={returnEverything}>Return everything</button>

          <div className="form-grid top-gap">
            <label>
              Refund by
              <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
                <option value="card">Card (POS reversal)</option>
              </select>
            </label>
            <label className="span-2">
              Reason *
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged, expired, wrong item" />
            </label>
          </div>

          <div className="payment-total top-gap">
            <span>Refund to customer</span>
            <strong>{formatNaira(refundTotal)}</strong>
          </div>

          {error && <div className="alert alert-error top-gap">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={refundTotal <= 0 || working}>
              {working ? 'Saving...' : canUseBackOffice(user) ? 'Complete Return' : 'Complete Return (needs manager)'}
            </button>
            {!initialSale && <button type="button" className="btn" onClick={() => setSale(null)}>Different receipt</button>}
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default ReturnModal;
