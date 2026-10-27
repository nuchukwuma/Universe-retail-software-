import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import TopBar from './TopBar';

const EVERYONE = ['owner', 'manager', 'cashier'];

// Menu items for the back office. "roles" says who can see each link.
const MENU = [
  { to: '/dashboard', label: '📊 Dashboard', roles: ['owner', 'manager'] },
  { to: '/sales-history', label: '🧾 Sales History', roles: EVERYONE },
  { to: '/end-of-day', label: '🌙 End of Day', roles: EVERYONE },
  { to: '/products', label: '📦 Products', roles: ['owner', 'manager'] },
  { to: '/categories', label: '🗂️ Categories', roles: ['owner', 'manager'] },
  { to: '/suppliers', label: '🚚 Suppliers', roles: ['owner', 'manager'] },
  { to: '/receive-stock', label: '📥 Receive Stock', roles: ['owner', 'manager'] },
  { to: '/stock-count', label: '🔢 Stock Count', roles: ['owner', 'manager'] },
  { to: '/barcode-labels', label: '🏷️ Barcode Labels', roles: ['owner', 'manager'] },
  { to: '/customers', label: '👤 Customers', roles: ['owner', 'manager'] },
  { to: '/feedback', label: '💬 Feedback', roles: ['owner', 'manager'] },
  { to: '/staff', label: '👥 Staff Accounts', roles: ['owner'] },
  { to: '/settings', label: '⚙️ Settings', roles: ['owner'] },
];

// Page frame for back office pages: top bar, side menu and the page itself.
function BackOfficeLayout() {
  const { user } = useAuth();
  const visibleMenu = MENU.filter((item) => hasRole(user, item.roles));

  return (
    <div className="back-office">
      <TopBar showCheckoutLink />
      <div className="back-office-body">
        <nav className="side-menu">
          {visibleMenu.map((item) => (
            <NavLink key={item.to} to={item.to} className="side-menu-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="back-office-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default BackOfficeLayout;
