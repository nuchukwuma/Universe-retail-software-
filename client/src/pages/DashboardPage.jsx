import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/roles';

// Back office home page for managers and owners.
// The sales cards and reports are added in Stage 6.
function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="card">
        <p>
          You are logged in as <strong>{user.name}</strong> ({ROLE_LABELS[user.role]}).
        </p>
        <p className="muted">Sales summary cards and reports will appear here in Stage 6.</p>
      </div>
    </div>
  );
}

export default DashboardPage;
