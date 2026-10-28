// The top of every back-office page: the title, one line saying what the
// page is for, and the page's main action(s) on the right.
function PageHeader({ title, lead, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {children && <div className="btn-row">{children}</div>}
    </header>
  );
}

export default PageHeader;
