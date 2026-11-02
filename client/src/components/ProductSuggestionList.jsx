import { formatNaira } from '../utils/formatNaira';

// The list of matching products under a "scan or type" box (see
// useProductSuggestions). "idPrefix" keeps the ids unique on the page;
// "empty" is what to show when nothing matches.
function ProductSuggestionList({ idPrefix, suggestions, active, setActive, onPick, empty }) {
  if (suggestions.length === 0) return <div className="scan-suggestions">{empty}</div>;
  return (
    <div className="scan-suggestions">
      <ul id={`${idPrefix}-suggestions`} role="listbox" aria-label="Matching products">
        {suggestions.map((product, index) => (
          <li
            key={product._id}
            id={`${idPrefix}-suggestion-${index}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? 'is-active' : undefined}
            // Keep the cursor in the box; the click picks the product.
            onMouseDown={(e) => e.preventDefault()}
            // Only a real mouse move highlights: a list that appears under a
            // resting pointer must not change what Enter picks.
            onMouseMove={() => index !== active && setActive(index)}
            onClick={() => onPick(product)}
          >
            <span className="scan-suggestion-name">
              {product.name}
              <span className="scan-suggestion-sub">{product.category?.name || 'No category'}{product.barcode ? '' : ', no barcode'}</span>
            </span>
            <span className="num strong">{formatNaira(product.sellingPrice)}</span>
            <span className={product.quantity > 0 ? 'num muted' : 'num danger-text'}>
              {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
            </span>
          </li>
        ))}
      </ul>
      <p className="scan-suggestions-hint">Up and Down keys to choose, Enter or click to add.</p>
    </div>
  );
}

export default ProductSuggestionList;
