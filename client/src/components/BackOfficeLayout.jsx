import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import TopBar from './TopBar';

const EVERYONE = ['owner', 'manager', 'cashier'];
const MANAGERS = ['owner', 'manager'];
const OWNER = ['owner'];

// The page list, in the order it is used most. "roles" says who can see
// each page. A group with no heading is shown on its own at the top.
const MENU = [
  {
    heading: '',
    links: [{ to: '/dashboard', label: 'Today', roles: MANAGERS }],
  },
  {
    heading: 'Selling',
    links: [
      { to: '/sales-history', label: 'Sales history', roles: EVERYONE },
      { to: '/end-of-day', label: 'End of day', roles: EVERYONE },
      { to: '/reports', label: 'Reports', roles: MANAGERS },
    ],
  },
  {
    heading: 'Stock',
    links: [
      { to: '/add-stock', label: 'Add stock', roles: MANAGERS },
      { to: '/products', label: 'Products', roles: MANAGERS },
      { to: '/stock-count', label: 'Stock count', roles: MANAGERS },
      { to: '/categories', label: 'Categories', roles: MANAGERS },
    ],
  },
  {
    heading: 'Shop',
    links: [
      { to: '/staff', label: 'Staff', roles: OWNER },
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
            <div key={group.heading || 'top'} className="office-nav-group">
              {group.heading && <div className="office-nav-heading">{group.heading}</div>}
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
