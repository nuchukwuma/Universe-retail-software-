import { useMemo, useState } from 'react';
import Modal from '../Modal';
import { formatNaira } from '../../utils/formatNaira';

const MAX_RESULTS = 60;

// Returns the products matching the search text and category.
function findProducts(products, text, categoryId) {
  const query = text.trim().toLowerCase();
  return products
    .filter((p) => categoryId === 'all' || p.category?._id === categoryId)
    .filter((p) => !query || p.name.toLowerCase().includes(query) || (p.barcode || '').startsWith(query))
    .slice(0, MAX_RESULTS);
}

// Find a product by name or category and add it to the bill (for items
// without a barcode, or a damaged label). The dialog stays open so
// several items can be added; arrows move, Enter adds.
function FindProductModal({ products, categories, startText = '', onAdd, onClose }) {
  const [text, setText] = useState(startText);
  const [categoryId, setCategoryId] = useState('all');
  const [selected, setSelected] = useState(0);
  const [lastAdded, setLastAdded] = useState('');

  const results = useMemo(() => findProducts(products, text, categoryId), [products, text, categoryId]);

  // Adds a product and gets ready for the next search.
  function add(product) {
    onAdd(product);
    setLastAdded(product.name);
    setText('');
    setSelected(0);
  }

  // Arrow keys move through the list; Enter adds the highlighted product.
  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results[selected]) add(results[selected]);
    }
  }

  return (
    <Modal
      title="Find product"
      onClose={onClose}
      wide
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>Done</button>}
    >
      <div className="field">
        <label className="field-label" htmlFor="find-text">Name or barcode</label>
        <input
          id="find-text"
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSelected(0);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoFocus
        />
        <span className="field-help">Up and down arrows choose a product. Enter adds it to the bill.</span>
      </div>

      <div className="choices" role="group" aria-label="Category">
        <button type="button" className="choice" aria-pressed={categoryId === 'all'} onClick={() => setCategoryId('all')}>
          All categories
        </button>
        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            className="choice"
            aria-pressed={categoryId === category._id}
            onClick={() => {
              setCategoryId(category._id);
              setSelected(0);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {lastAdded && <p className="success-text strong" role="status">Added to the bill: {lastAdded}</p>}

      <div className="find-results">
        {results.length === 0 ? (
          <p className="empty">No product matches "{text}". Check the spelling, or choose another category.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th className="num">Price</th>
                <th className="num">In stock</th>
                <th><span className="visually-hidden">Add</span></th>
              </tr>
            </thead>
            <tbody>
              {results.map((product, index) => (
                <tr key={product._id} className={index === selected ? 'is-selected' : undefined}>
                  <td className="cell-main">{product.name}</td>
                  <td className="muted">{product.barcode || 'None'}</td>
                  <td className="num">{formatNaira(product.sellingPrice)}</td>
                  <td className={product.quantity <= 0 ? 'num danger-text' : 'num'}>{product.quantity}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-small" onClick={() => add(product)}>
                      Add<span className="visually-hidden"> {product.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

export default FindProductModal;
