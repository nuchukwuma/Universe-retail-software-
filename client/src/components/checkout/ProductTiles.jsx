import { useMemo, useState } from 'react';
import ProductThumb from '../ProductThumb';
import { formatNaira } from '../../utils/formatNaira';
import { categoryTone, toneStyle } from '../../utils/categoryTone';

const MAX_TILES = 240;

// The right side of the till: category buttons, then a tile for every
// product in the chosen category. A click on a tile adds one to the bill.
function ProductTiles({ products, categories, onAdd }) {
  const [categoryId, setCategoryId] = useState('all');

  // Only categories that have products, plus "Other" for products with none.
  const usedCategories = useMemo(() => {
    const used = new Set(products.map((p) => p.category?._id || 'none'));
    const list = categories.filter((c) => used.has(c._id));
    if (used.has('none')) list.push({ _id: 'none', name: 'Other' });
    return list;
  }, [products, categories]);

  const shown = useMemo(() => {
    const inCategory = categoryId === 'all'
      ? products
      : products.filter((p) => (p.category?._id || 'none') === categoryId);
    return [...inCategory].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, categoryId]);

  return (
    <section className="catalogue" aria-label="Products">
      <div className="category-bar" role="tablist" aria-label="Categories">
        <button
          type="button"
          role="tab"
          aria-selected={categoryId === 'all'}
          className="category-chip"
          onClick={() => setCategoryId('all')}
        >
          All
        </button>
        {usedCategories.map((c) => (
          <button
            key={c._id}
            type="button"
            role="tab"
            aria-selected={categoryId === c._id}
            className="category-chip"
            style={toneStyle(categoryTone(c._id === 'none' ? null : c._id, categories))}
            onClick={() => setCategoryId(c._id)}
          >
            <span className="category-dot" aria-hidden="true" />
            {c.name}
          </button>
        ))}
      </div>

      <div className="tiles">
        {shown.slice(0, MAX_TILES).map((product) => {
          const out = product.quantity <= 0;
          const low = !out && product.quantity <= (product.reorderLevel ?? 0);
          return (
            <button key={product._id} type="button" className={out ? 'tile is-out' : 'tile'} onClick={() => onAdd(product)}>
              <ProductThumb product={product} tone={categoryTone(product.category?._id, categories)} className="tile-picture" />
              <span className="tile-name">{product.name}</span>
              <span className="tile-foot">
                <span className="tile-price">{formatNaira(product.sellingPrice)}</span>
                <span className={out ? 'tile-stock danger-text' : low ? 'tile-stock warning-text' : 'tile-stock'}>
                  {out ? 'Out' : product.quantity}
                </span>
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="muted tiles-empty">No products</p>}
      </div>
      {shown.length > MAX_TILES && (
        <p className="tiles-more muted small">{MAX_TILES} of {shown.length} shown</p>
      )}
    </section>
  );
}

export default ProductTiles;
