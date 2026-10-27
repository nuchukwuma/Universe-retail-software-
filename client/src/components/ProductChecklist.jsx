import { useState } from 'react';

// A searchable list of products with tick boxes.
// "selectedIds" is an array of product ids; onChange gets the new array.
function ProductChecklist({ products, selectedIds, onChange }) {
  const [filter, setFilter] = useState('');

  const query = filter.trim().toLowerCase();
  const visible = products.filter((p) => p.name.toLowerCase().includes(query));

  // Ticks or unticks one product.
  function toggle(productId) {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter((id) => id !== productId));
    } else {
      onChange([...selectedIds, productId]);
    }
  }

  return (
    <div className="product-checklist">
      <input
        type="search"
        placeholder={`Filter products (${selectedIds.length} selected)`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="product-checklist-items">
        {visible.map((product) => (
          <label key={product._id} className="checkbox-row">
            <input
              type="checkbox"
              checked={selectedIds.includes(product._id)}
              onChange={() => toggle(product._id)}
            />
            {product.name}
          </label>
        ))}
        {visible.length === 0 && <p className="muted small">No products match.</p>}
      </div>
    </div>
  );
}

export default ProductChecklist;
