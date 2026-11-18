// The top of every page: the title, and the page's main action(s) on the right.
function PageHeader({ title, children }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children && <div className="btn-row">{children}</div>}
    </header>
  );
}

export default PageHeader;
