import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import TopBar from './TopBar';

// Menu items for the back office. "roles" says who can see each link.
// More pages (products, reports, settings...) are added in later stages.
const MENU = [
  { to: '/dashboard', label: '📊 Dashboard', roles: ['owner', 'manager'] },
  { to: '/products', label: '📦 Products', roles: ['owner', 'manager'] },
  { to: '/categories', label: '🗂️ Categories', roles: ['owner', 'manager'] },
  { to: '/suppliers', label: '🚚 Suppliers', roles: ['owner', 'manager'] },
  { to: '/receive-stock', label: '📥 Receive Stock', roles: ['owner', 'manager'] },
  { to: '/stock-count', label: '🔢 Stock Count', roles: ['owner', 'manager'] },
  { to: '/barcode-labels', label: '🏷️ Barcode Labels', roles: ['owner', 'manager'] },
  { to: '/customers', label: '👤 Customers', roles: ['owner', 'manager'] },
  { to: '/staff', label: '👥 Staff Accounts', roles: ['owner'] },
];

// Page frame for manager/owner pages: top bar, side menu and the page itself.
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
