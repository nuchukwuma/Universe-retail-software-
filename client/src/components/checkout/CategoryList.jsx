// The list of category cards on the right. Tapping one filters the
// product grid. "all" shows every product.
function CategoryList({ categories, activeId, onSelect }) {
  const choices = [{ _id: 'all', name: 'All', icon: '🏪' }, ...categories];

  return (
    <nav className="category-list" aria-label="Categories">
      {choices.map((category) => (
        <button
          key={category._id}
          type="button"
          className={category._id === activeId ? 'category-button active' : 'category-button'}
          onClick={() => onSelect(category._id)}
        >
          <span className="category-button-image">
            {category.image ? <img src={category.image} alt="" /> : category.icon}
          </span>
          <span>{category.name}</span>
        </button>
      ))}
    </nav>
  );
}

export default CategoryList;
