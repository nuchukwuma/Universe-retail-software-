// Names and status colours for purchase orders.
export const PURCHASE_STATUS = {
  ordered: { label: 'Ordered', className: 'status-quiet' },
  part_received: { label: 'Part received', className: 'status-low' },
  received: { label: 'Received', className: 'status-ok' },
  cancelled: { label: 'Cancelled', className: 'status-out' },
};

// How many of a line are still to come.
export function outstanding(line) {
  return Math.max(0, line.quantity - (line.receivedQuantity || 0));
}
