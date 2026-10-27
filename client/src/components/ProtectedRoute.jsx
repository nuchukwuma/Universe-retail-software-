import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../utils/roles';
import LoadingScreen from './LoadingScreen';

// Shows the page only to logged-in users with an allowed role.
// Not logged in -> login page. Wrong role -> checkout screen.
function ProtectedRoute({ roles, children }) {
  const { user, checkingSession } = useAuth();

  if (checkingSession) {
    return <LoadingScreen message="Checking your login..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(user, roles)) {
    return <Navigate to="/checkout" replace />;
  }

  return children;
}

export default ProtectedRoute;
