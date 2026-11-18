import { toneStyle } from '../utils/categoryTone';

// "Peak Milk Powder" -> "PM"
function productInitials(name = '') {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  if (words.length === 0) return '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

// A product's picture, or its initials on its category's colour when it has none.
function ProductThumb({ product, tone = 8, className = '' }) {
  if (product.pictureUrl) {
    return <img src={product.pictureUrl} alt="" className={`thumb ${className}`} loading="lazy" />;
  }
  return (
    <span className={`thumb thumb-initials ${className}`} style={toneStyle(tone)} aria-hidden="true">
      {productInitials(product.name)}
    </span>
  );
}

export default ProductThumb;
