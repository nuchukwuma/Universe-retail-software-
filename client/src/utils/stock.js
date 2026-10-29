// Returns true when stock is at or below the product's low-stock level.
export function isLowStock(product) {
  return product.quantity <= product.reorderLevel;
}

// Returns the stock status of a product as { key, label }:
//   out = none left, low = at or below its low-stock level, ok = enough.
export function stockStatus(product) {
  if (product.quantity <= 0) return { key: 'out', label: 'Out of stock' };
  if (isLowStock(product)) return { key: 'low', label: 'Low' };
  return { key: 'ok', label: 'In stock' };
}
