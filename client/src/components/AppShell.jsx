import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  DatabaseBackup,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { ROLE_LABELS, hasRole } from '../utils/roles';
import BrandMark from './BrandMark';

const EVERYONE = ['owner', 'manager', 'cashier'];
const MANAGERS = ['owner', 'manager'];
const OWNER = ['owner'];

// Every screen, grouped, in the order they are used most.
export const MENU = [
  {
    heading: '',
    links: [
      { to: '/checkout', label: 'Sell', icon: ShoppingCart, roles: EVERYONE },
      { to: '/dashboard', label: 'Today', icon: LayoutDashboard, roles: MANAGERS },
    ],
  },
  {
    heading: 'Sales',
    links: [
      { to: '/sales-history', label: 'Sales history', icon: ReceiptText, roles: EVERYONE },
      { to: '/end-of-day', label: 'End of day', icon: CalendarCheck, roles: EVERYONE },
      { to: '/reports', label: 'Reports', icon: ChartColumn, roles: MANAGERS },
    ],
  },
  {
    heading: 'Stock',
    links: [
      { to: '/products', label: 'Products', icon: Package, roles: MANAGERS },
      { to: '/add-stock', label: 'Add stock', icon: PackagePlus, roles: MANAGERS },
      { to: '/purchases', label: 'Purchase orders', icon: ClipboardList, roles: MANAGERS },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: MANAGERS },
      { to: '/stock-count', label: 'Stock count', icon: ListChecks, roles: MANAGERS },
      { to: '/categories', label: 'Categories', icon: Tags, roles: MANAGERS },
    ],
  },
  {
    heading: 'Shop',
    links: [
      { to: '/staff', label: 'Staff', icon: Users, roles: OWNER },
      { to: '/settings', label: 'Settings', icon: Settings, roles: OWNER },
      { to: '/backup', label: 'Backup', icon: DatabaseBackup, roles: OWNER },
    ],
  },
];

const COLLAPSED_KEY = 'hd_sidebar_collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

// The frame around every signed-in screen: the sidebar (shop, screens,
// who is signed in) and the screen itself. On a phone the sidebar opens
// from a menu button.
function AppShell() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // A new screen closes the phone menu.
  useEffect(() => setDrawerOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((was) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, was ? '0' : '1');
      } catch {
        // remembered for this visit only
      }
      return !was;
    });
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const groups = MENU.map((group) => ({ ...group, links: group.links.filter((link) => hasRole(user, link.roles)) }))
    .filter((group) => group.links.length > 0);
  const onTill = pathname.startsWith('/checkout');
  const shellClass = ['shell', collapsed && 'is-collapsed', drawerOpen && 'is-drawer-open', onTill && 'is-till']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <div className="mobile-bar">
        <button type="button" className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <Menu size={22} aria-hidden="true" />
        </button>
        <span className="mobile-bar-name">{settings.storeName}</span>
      </div>

      <aside className="sidebar" aria-label="Main menu">
        <div className="sidebar-brand">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="" className="sidebar-logo" />
          ) : (
            <BrandMark className="sidebar-logo" />
          )}
          <span className="sidebar-store" title={settings.storeName}>{settings.storeName}</span>
          <button type="button" className="icon-btn sidebar-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div key={group.heading || 'top'} className="sidebar-group">
              {group.heading && <div className="sidebar-heading">{group.heading}</div>}
              {group.links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className="sidebar-link" title={collapsed ? label : undefined}>
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                  <span className="sidebar-label">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user" title={collapsed ? `${user?.name}, ${ROLE_LABELS[user?.role]}` : undefined}>
            <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
            <span className="sidebar-label sidebar-person">
              <strong>{user?.name}</strong>
              <span>{ROLE_LABELS[user?.role]}</span>
            </span>
          </div>
          <button type="button" className="sidebar-link" onClick={handleLogout} title={collapsed ? 'Log out' : undefined}>
            <LogOut size={20} strokeWidth={1.9} aria-hidden="true" />
            <span className="sidebar-label">Log out</span>
          </button>
          <button
            type="button"
            className="sidebar-link sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Show menu names' : 'Hide menu names'}
            title={collapsed ? 'Show menu names' : undefined}
          >
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
            <span className="sidebar-label">Hide names</span>
          </button>
        </div>
      </aside>
      <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}

// "Ada Obi" -> "AO"
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default AppShell;
