import { useState } from 'react';
import { useKeyTiming } from '../hooks/useScanner';
import useProductSuggestions, { hasLetter } from '../hooks/useProductSuggestions';
import ProductSuggestionList from './ProductSuggestionList';

// The Add stock page's "scan or type" box. For barcodes that will not scan,
// type part of the product's name instead.
// - A scan, or digits + Enter: onBarcode(code)
// - Typing a name lists matching products: Enter or a click picks one,
//   onPick(product)
// - A name nothing matches: onNewProduct(name), to add it as a new product
//   without a barcode
// (data-scan-input tells the page-wide scanner listener to leave it alone.)
function StockLookupBox({ id, products, onBarcode, onPick, onNewProduct, inputRef }) {
  const [code, setCode] = useState('');
  const timing = useKeyTiming();
  const list = useProductSuggestions(products, code);

  // Empties the box, ready for the next product.
  function clear() {
    setCode('');
    list.reset();
    timing.reset();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const typed = code.trim();
      if (!typed) return;
      const scanned = timing.wasScanner();
      const product = scanned ? null : list.pickFor(typed);
      clear();
      if (product) onPick(product);
      else if (!scanned && hasLetter(typed)) onNewProduct(typed);
      else onBarcode(typed);
      return;
    }
    if (list.listOpen && list.suggestions.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      list.move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Escape' && list.listOpen) {
      list.dismiss();
      return;
    }
    timing.record(event);
  }

  return (
    <div className="scan-field">
      <input
        id={id}
        ref={inputRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Scan, or type part of the name"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        data-scan-input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={list.listOpen}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={list.listOpen && list.active >= 0 ? `${id}-suggestion-${list.active}` : undefined}
      />
      {list.listOpen && (
        <ProductSuggestionList
          idPrefix={id}
          suggestions={list.suggestions}
          active={list.active}
          setActive={list.setActive}
          onPick={(product) => {
            clear();
            onPick(product);
          }}
          empty={(
            <div className="scan-suggestions-empty">
              <p>No product matches "{list.query}".</p>
              {hasLetter(list.query) && (
                <button
                  type="button"
                  className="btn btn-small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const name = list.query;
                    clear();
                    onNewProduct(name);
                  }}
                >
                  Add "{list.query}" as a new product
                </button>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}

export default StockLookupBox;
