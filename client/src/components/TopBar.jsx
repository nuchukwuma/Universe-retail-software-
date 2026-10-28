import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { ROLE_LABELS, canUseBackOffice } from '../utils/roles';

// Turns an ISO date string into a short time like "8:05 AM".
function formatLoginTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}

// The bar across the top of every screen: shop name, the two modes of
// the app (Sell and Back office), who is signed in, and Log out.
function TopBar() {
  const { user, loginTime, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Logs the user out and goes back to the login page.
  function handleLogout() {
    logout();
    navigate('/login');
  }

  const officeLink = canUseBackOffice(user) ? '/dashboard' : '/sales-history';
  const inOffice = !pathname.startsWith('/checkout');

  return (
    <header className="topbar">
      <span className="topbar-store">{settings.storeName}</span>

      <nav className="topbar-nav" aria-label="Main">
        <NavLink to="/checkout" className="topbar-link">Sell</NavLink>
        <Link to={officeLink} className={inOffice ? 'topbar-link active' : 'topbar-link'} aria-current={inOffice ? 'page' : undefined}>
          {canUseBackOffice(user) ? 'Back office' : 'My sales'}
        </Link>
      </nav>

      <div className="topbar-user">
        <div className="topbar-person">
          <strong>{user?.name}</strong>
          <span>{ROLE_LABELS[user?.role]}{loginTime ? `, signed in at ${formatLoginTime(loginTime)}` : ''}</span>
        </div>
        <button type="button" className="btn btn-small" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default TopBar;
