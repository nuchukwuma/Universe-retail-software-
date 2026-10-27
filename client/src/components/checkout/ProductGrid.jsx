import { useState } from 'react';
import ProductImage from '../ProductImage';
import { formatNaira } from '../../utils/formatNaira';
import { unitPriceFor } from '../../utils/billMath';

// Only this many cards are drawn at first, so big shops stay fast.
const PAGE_SIZE = 120;

// The grid of product cards. Tapping a card adds one to the bill.
function ProductGrid({ products, priceType, onAdd }) {
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const visible = products.slice(0, shownCount);

  if (products.length === 0) {
    return <p className="grid-empty muted">No products here. Try another category or search.</p>;
  }

  return (
    <div className="product-grid-wrap">
      <div className="product-grid">
        {visible.map((product) => (
          <button key={product._id} type="button" className="product-card" onClick={() => onAdd(product)}>
            <ProductImage product={product} size={72} />
            <span className="product-card-name">{product.name}</span>
            <strong className="product-card-price">{formatNaira(unitPriceFor(product, priceType))}</strong>
            {product.quantity <= 0 && <span className="product-card-stock">Out of stock</span>}
          </button>
        ))}
      </div>
      {products.length > shownCount && (
        <button type="button" className="btn btn-block" onClick={() => setShownCount(shownCount + PAGE_SIZE)}>
          Show more ({products.length - shownCount} more)
        </button>
      )}
    </div>
  );
}

export default ProductGrid;
