// Shows a product's picture. If it has none, shows its category icon
// on a light blue tile instead.
function ProductImage({ product, size = 44 }) {
  const style = { width: size, height: size, fontSize: size * 0.5 };

  if (product.image) {
    return <img src={product.image} alt="" className="product-image" style={style} loading="lazy" />;
  }

  return (
    <span className="product-image product-image-empty" style={style} aria-hidden="true">
      {product.category?.icon || '🛒'}
    </span>
  );
}

export default ProductImage;
