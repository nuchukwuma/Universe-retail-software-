import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import TopBar from './TopBar';

const EVERYONE = ['owner', 'manager', 'cashier'];
const MANAGERS = ['owner', 'manager'];
const OWNER = ['owner'];

// The page list, grouped by job. "roles" says who can see each page.
const MENU = [
  {
    heading: 'Selling',
    links: [
      { to: '/sales-history', label: 'Sales history', roles: EVERYONE },
      { to: '/end-of-day', label: 'End of day', roles: EVERYONE },
    ],
  },
  {
    heading: 'Reports',
    links: [
      { to: '/dashboard', label: 'Today', roles: MANAGERS },
      { to: '/reports', label: 'Reports', roles: MANAGERS },
    ],
  },
  {
    heading: 'Stock',
    links: [
      { to: '/products', label: 'Products', roles: MANAGERS },
      { to: '/categories', label: 'Categories', roles: MANAGERS },
      { to: '/receive-stock', label: 'Receive stock', roles: MANAGERS },
      { to: '/stock-count', label: 'Stock count', roles: MANAGERS },
      { to: '/barcode-labels', label: 'Barcode labels', roles: MANAGERS },
    ],
  },
  {
    heading: 'People',
    links: [
      { to: '/customers', label: 'Customers', roles: MANAGERS },
      { to: '/feedback', label: 'Feedback', roles: MANAGERS },
      { to: '/staff', label: 'Staff', roles: OWNER },
    ],
  },
  {
    heading: 'Shop',
    links: [
      { to: '/settings', label: 'Settings', roles: OWNER },
      { to: '/backup', label: 'Backup and restore', roles: OWNER },
    ],
  },
];

// Page frame for back-office pages: top bar, page list and the page itself.
function BackOfficeLayout() {
  const { user } = useAuth();
  const groups = MENU.map((group) => ({ ...group, links: group.links.filter((link) => hasRole(user, link.roles)) }))
    .filter((group) => group.links.length > 0);

  return (
    <>
      <TopBar />
      <div className="office">
        <nav className="office-nav" aria-label="Back office pages">
          {groups.map((group) => (
            <div key={group.heading} className="office-nav-group">
              <div className="office-nav-heading">{group.heading}</div>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} className="office-nav-link">
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <main className="office-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}

export default BackOfficeLayout;
