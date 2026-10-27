// Products expiring within this many days get an expiry warning.
export const EXPIRY_WARNING_DAYS = 30;

const ONE_DAY = 24 * 60 * 60 * 1000;

// Returns true when stock is at or below the product's reorder level.
export function isLowStock(product) {
  return product.quantity <= product.reorderLevel;
}

// Returns how many whole days until the product expires
// (negative if already expired), or null if it has no expiry date.
export function daysUntilExpiry(product) {
  if (!product.expiryDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(product.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  return Math.round((expiry - today) / ONE_DAY);
}

// Returns "expired", "soon" (within 30 days) or null.
export function expiryStatus(product) {
  const days = daysUntilExpiry(product);
  if (days === null) return null;
  if (days < 0) return 'expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'soon';
  return null;
}

// Returns a short sentence such as "Expires in 12 days".
export function expiryLabel(product) {
  const days = daysUntilExpiry(product);
  if (days === null) return '';
  if (days < 0) return `Expired ${-days} day${days === -1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}
