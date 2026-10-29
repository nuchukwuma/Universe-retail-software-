import { useState } from 'react';
import { formatNaira } from '../utils/formatNaira';

// Returns up to "limit" products whose name or barcode matches the text.
export function searchProducts(products, text, limit = 8) {
  const query = text.trim().toLowerCase();
  if (!query) return [];
  return products
    .filter((p) => p.name.toLowerCase().includes(query) || (p.barcode || '').startsWith(query))
    .slice(0, limit);
}

// A search box that lists matching products as you type.
// Clicking a result (or pressing Enter for the first one) calls onSelect(product).
function ProductSearch({ products, onSelect, id, placeholder = 'Type part of a name or barcode' }) {
  const [text, setText] = useState('');
  const matches = searchProducts(products, text);

  // Picks a product and clears the box.
  function choose(product) {
    onSelect(product);
    setText('');
  }

  // Enter picks the first match instead of submitting a form.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (matches[0]) choose(matches[0]);
    }
  }

  return (
    <div className="product-search">
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {text && (
        <ul className="product-search-results">
          {matches.length === 0 && <li className="product-search-empty">No product matches "{text}".</li>}
          {matches.map((product) => (
            <li key={product._id}>
              <button type="button" onClick={() => choose(product)}>
                <span className="strong">{product.name}</span>
                <span className="muted">{product.barcode || 'No barcode'}</span>
                <span className="num">{formatNaira(product.sellingPrice)}</span>
                <span className="num muted">{product.quantity} in stock</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductSearch;
