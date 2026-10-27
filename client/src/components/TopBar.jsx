import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STORE_NAME, STORE_LOGO } from '../config';
import { ROLE_LABELS, canUseBackOffice } from '../utils/roles';

// Turns an ISO date string into a short time like "8:05 AM".
function formatLoginTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}

// The blue bar at the top of every screen: store name on the left,
// staff name, login time and logout button on the right.
function TopBar({ showBackOfficeLink = false, showCheckoutLink = false }) {
  const { user, loginTime, logout } = useAuth();
  const navigate = useNavigate();

  // Logs the user out and goes back to the login page.
  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <img src={STORE_LOGO} alt="" className="top-bar-logo" />
        <span className="top-bar-store">{STORE_NAME}</span>
      </div>

      <div className="top-bar-right">
        {showBackOfficeLink && canUseBackOffice(user) && (
          <Link to="/dashboard" className="top-bar-link">Back Office</Link>
        )}
        {showCheckoutLink && (
          <Link to="/checkout" className="top-bar-link">Checkout</Link>
        )}
        <div className="top-bar-user">
          <strong>{user?.name}</strong>
          <small>
            {ROLE_LABELS[user?.role]} · Logged in {formatLoginTime(loginTime)}
          </small>
        </div>
        <button type="button" className="btn btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default TopBar;
