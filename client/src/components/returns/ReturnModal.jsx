import { useId, useState } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../Modal';
import BarcodeInput from '../BarcodeInput';
import { ManagerApprovalModal } from '../checkout/ManagerApprovalForm';
import { formatNaira } from '../../utils/formatNaira';
import { formatDateTime } from '../../utils/dates';
import { roundMoney } from '../../utils/billMath';
import { canUseBackOffice } from '../../utils/roles';

// What the customer really paid for ONE of a sale line, after all
// discounts, in whole Naira (same sum as the server).
function refundPerItem(sale, item) {
  const linesTotal = sale.items.reduce((sum, line) => sum + line.lineTotal, 0);
  const share = linesTotal > 0 ? sale.total / linesTotal : 0;
  return Math.round((item.lineTotal / item.quantity) * share);
}

// Returning items:
// 1. find the sale (scan the receipt barcode or type its number)
// 2. choose what comes back and why
// 3. a manager approves (when a cashier is doing it)
// Calls onDone({ return, sale }) when the return is saved.
function ReturnModal({ initialSale = null, onDone, onClose }) {
  const { user } = useAuth();
  const formId = useId();
  const [receiptNumber, setReceiptNumber] = useState('');
  const [sale, setSale] = useState(initialSale);
  const [quantities, setQuantities] = useState({}); // { lineIndex: quantity }
  const [reason, setReason] = useState('');
  const [askApproval, setAskApproval] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  // Looks up a sale by receipt number (typed or scanned).
  async function findSale(number) {
    setError('');
    setWorking(true);
    try {
      setSale(await api.get(`/sales/by-receipt/${encodeURIComponent(number.trim())}`));
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

  // Fills in every item that has not been returned yet.
  function returnEverything() {
    const all = {};
    sale.items.forEach((item, index) => {
      all[index] = item.quantity - (item.returnedQuantity || 0);
    });
    setQuantities(all);
  }

  // Sends the return to the server (with a manager's approval if needed).
  async function saveReturn(approvalToken) {
    setWorking(true);
    setError('');
    try {
      const items = Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([lineIndex, quantity]) => ({ lineIndex: Number(lineIndex), quantity }));
      onDone(await api.post('/returns', { saleId: sale._id, items, reason, approvalToken }));
    } catch (err) {
      setError(err.message);
      setAskApproval(false);
      setWorking(false);
    }
  }

  // Runs when "Complete return" is pressed.
  function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Enter the reason for the return.');
      return;
    }
    if (canUseBackOffice(user)) saveReturn();
    else setAskApproval(true);
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
      <ManagerApprovalModal
        reason={`Approve a refund of ${formatNaira(refundTotal)} on receipt ${sale.receiptNumber}.`}
        onApproved={(approval) => saveReturn(approval.token)}
        onClose={() => setAskApproval(false)}
      />
    );
  }

  // ----- Step 1: find the sale -----
  if (!sale) {
    return (
      <Modal
        title="Return items"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => findSale(receiptNumber)} disabled={!receiptNumber.trim() || working}>
              {working ? 'Looking...' : 'Find the sale'}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-receipt`}>Receipt number</label>
          <BarcodeInput id={`${formId}-receipt`} value={receiptNumber} onChange={setReceiptNumber} onEnter={findSale} placeholder="e.g. 261027-0001" autoFocus />
          <span className="field-help">Scan the barcode at the bottom of the customer's receipt, or type the number.</span>
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
      </Modal>
    );
  }

  // ----- Step 2: choose items -----
  const nothingLeft = sale.items.every((item) => item.quantity - (item.returnedQuantity || 0) <= 0);

  return (
    <Modal
      title={`Return from receipt ${sale.receiptNumber}`}
      onClose={onClose}
      wide
      footer={
        <>
          {!initialSale && <button type="button" className="btn push-left" onClick={() => setSale(null)}>Use a different receipt</button>}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          {!nothingLeft && (
            <button type="submit" form={formId} className="btn btn-primary" disabled={refundTotal <= 0 || working}>
              {working ? 'Saving...' : canUseBackOffice(user) ? 'Complete return' : 'Complete return (needs a manager)'}
            </button>
          )}
        </>
      }
    >
      <p className="muted">
        Sold on {formatDateTime(sale.createdAt)} by {sale.cashierName}
        {sale.customerName ? ` to ${sale.customerName}` : ''}. Total paid {formatNaira(sale.total)}.
      </p>

      {nothingLeft ? (
        <div className="notice notice-warning">Everything on this receipt has already been returned.</div>
      ) : (
        <form id={formId} className="stack" onSubmit={handleSubmit}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Bought</th>
                  <th className="num">Refund each</th>
                  <th className="num">Return</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => {
                  const left = item.quantity - (item.returnedQuantity || 0);
                  return (
                    <tr key={index}>
                      <td>
                        <span className="cell-main">{item.name}</span>
                        {item.returnedQuantity > 0 && <span className="cell-sub">{item.returnedQuantity} already returned</span>}
                      </td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">{formatNaira(refundPerItem(sale, item))}</td>
                      <td className="num">
                        <input
                          type="number"
                          min="0"
                          max={left}
                          className="input-number"
                          value={quantities[index] || 0}
                          onChange={(e) => setQuantity(index, e.target.value, left)}
                          disabled={left <= 0}
                          aria-label={`How many ${item.name} to return`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-small" onClick={returnEverything}>Return everything</button>
          </div>

          <div className="field">
            <label className="field-label" htmlFor={`${formId}-reason`}>Reason</label>
            <input id={`${formId}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged, wrong item" />
          </div>

          <dl className="facts">
            <dt>Refund to customer</dt>
            <dd className="confirm-total">{formatNaira(refundTotal)}</dd>
          </dl>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
        </form>
      )}
    </Modal>
  );
}

export default ReturnModal;
