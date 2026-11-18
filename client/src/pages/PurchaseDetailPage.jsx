import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatNaira } from '../utils/formatNaira';
import { formatDate, formatDateTime } from '../utils/dates';
import { PURCHASE_STATUS, outstanding } from '../utils/purchases';

// What arrived in a delivery: one row per line still to come.
function ReceiveModal({ order, onDone, onClose }) {
  const [rows, setRows] = useState(() =>
    order.items.map((line, lineIndex) => ({ lineIndex, quantity: outstanding(line), unitCost: line.unitCost })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setRow(lineIndex, field, value) {
    setRows((current) => current.map((row) => (row.lineIndex === lineIndex ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const items = rows
      .filter((row) => Number(row.quantity) > 0)
      .map((row) => ({ lineIndex: row.lineIndex, quantity: Number(row.quantity), unitCost: Number(row.unitCost) || 0 }));
    if (items.length === 0) {
      setError('Enter how many arrived.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onDone(await api.post(`/purchases/${order._id}/receive`, { items }));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Receive ${order.purchaseNumber}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="receive-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add to stock'}
          </button>
        </>
      }
    >
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <form id="receive-form" onSubmit={handleSubmit}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Still to come</th>
              <th className="num">Arrived</th>
              <th className="num">Cost each</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((line, lineIndex) => {
              const left = outstanding(line);
              if (left === 0) return null;
              const row = rows[lineIndex];
              return (
                <tr key={lineIndex}>
                  <td className="cell-main">{line.name}</td>
                  <td className="num">{left}</td>
                  <td className="num">
                    <input
                      className="input-number"
                      type="number"
                      min="0"
                      max={left}
                      step="1"
                      value={row.quantity}
                      onChange={(e) => setRow(lineIndex, 'quantity', e.target.value)}
                      aria-label={`How many ${line.name} arrived`}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="input-number"
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitCost}
                      onChange={(e) => setRow(lineIndex, 'unitCost', e.target.value)}
                      aria-label={`Cost of one ${line.name}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </form>
    </Modal>
  );
}

// One purchase order: its lines, what has arrived, and Receive / Cancel.
function PurchaseDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [receiving, setReceiving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/purchases/${id}`).then(setOrder).catch((err) => setError(err.message));
  }, [id]);

  function received(result) {
    setOrder(result.purchase);
    setMessage(result.message);
    setReceiving(false);
  }

  async function cancelOrder() {
    if (!window.confirm(`Cancel purchase order ${order.purchaseNumber}?`)) return;
    try {
      const result = await api.post(`/purchases/${id}/cancel`);
      setOrder(result.purchase);
      setMessage(result.message);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!order) {
    return error ? <div className="notice notice-error" role="alert">{error}</div> : <p className="loading">Loading...</p>;
  }

  const status = PURCHASE_STATUS[order.status] || PURCHASE_STATUS.ordered;
  const open = order.status === 'ordered' || order.status === 'part_received';
  const receivedValue = order.items.reduce((sum, line) => sum + (line.receivedQuantity || 0) * line.unitCost, 0);

  return (
    <div className="page">
      <PageHeader title={order.purchaseNumber}>
        {order.status === 'ordered' && (
          <>
            <button type="button" className="btn btn-danger" onClick={cancelOrder}>Cancel order</button>
            <Link to={`/purchases/${id}/edit`} className="btn">Edit</Link>
          </>
        )}
        {open && <button type="button" className="btn btn-primary" onClick={() => setReceiving(true)}>Receive delivery</button>}
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <section className="panel">
        <dl className="facts">
          <dt>Status</dt>
          <dd><span className={`status ${status.className}`}>{status.label}</span></dd>
          <dt>Supplier</dt>
          <dd>{order.supplierName}</dd>
          <dt>Ordered</dt>
          <dd>{formatDateTime(order.createdAt)}, {order.createdByName}</dd>
          {order.expectedDate && (
            <>
              <dt>Expected</dt>
              <dd>{formatDate(order.expectedDate)}</dd>
            </>
          )}
          {order.receivedAt && (
            <>
              <dt>Received</dt>
              <dd>{formatDateTime(order.receivedAt)}</dd>
            </>
          )}
          {order.notes && (
            <>
              <dt>Notes</dt>
              <dd>{order.notes}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="panel panel-flush" aria-label="Items">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Ordered</th>
                <th className="num">Received</th>
                <th className="num">Cost each</th>
                <th className="num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((line, index) => (
                <tr key={index}>
                  <td className="cell-main">{line.name}</td>
                  <td className="num">{line.quantity}</td>
                  <td className={line.receivedQuantity >= line.quantity ? 'num success-text strong' : 'num'}>{line.receivedQuantity || 0}</td>
                  <td className="num">{formatNaira(line.unitCost)}</td>
                  <td className="num strong">{formatNaira(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4">Total{order.status === 'part_received' ? ` (received so far ${formatNaira(receivedValue)})` : ''}</td>
                <td className="num">{formatNaira(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {receiving && <ReceiveModal order={order} onDone={received} onClose={() => setReceiving(false)} />}
    </div>
  );
}

export default PurchaseDetailPage;
