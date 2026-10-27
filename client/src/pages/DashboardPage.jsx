import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../components/ProductImage';
import { ROLE_LABELS } from '../utils/roles';
import { formatDate } from '../utils/dates';
import { expiryLabel, expiryStatus } from '../utils/stockAlerts';

// Back office home page for managers and owners.
// Shows stock alerts now; sales cards are added in Stage 6.
function DashboardPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState({ lowStock: [], expiring: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the low-stock and expiry alerts when the page opens.
  useEffect(() => {
    async function loadAlerts() {
      try {
        setAlerts(await api.get('/products/alerts'));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const expiredCount = alerts.expiring.filter((p) => expiryStatus(p) === 'expired').length;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="muted">
        Welcome, {user.name} ({ROLE_LABELS[user.role]}). Sales cards and reports will appear here in Stage 6.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-cards">
        <Link to="/products?filter=low" className="stat-card stat-card-red">
          <span>Low stock</span>
          <strong>{loading ? '…' : alerts.lowStock.length}</strong>
          <small>products at or below reorder level</small>
        </Link>
        <Link to="/products?filter=expiring" className="stat-card stat-card-orange">
          <span>Expiring soon</span>
          <strong>{loading ? '…' : alerts.expiring.length}</strong>
          <small>{expiredCount > 0 ? `${expiredCount} already expired` : 'within the next 30 days'}</small>
        </Link>
      </div>

      <div className="two-columns">
        <div className="card">
          <h2>⚠️ Low stock</h2>
          {!loading && alerts.lowStock.length === 0 && <p className="muted">All products are well stocked.</p>}
          <ul className="alert-list">
            {alerts.lowStock.map((p) => (
              <li key={p._id}>
                <ProductImage product={p} size={36} />
                <span className="alert-list-name">{p.name}</span>
                <span className="badge badge-red">{p.quantity} left</span>
                <small className="muted">reorder at {p.reorderLevel}</small>
              </li>
            ))}
          </ul>
          {alerts.lowStock.length > 0 && <Link to="/receive-stock" className="btn btn-small">Receive stock →</Link>}
        </div>

        <div className="card">
          <h2>⏰ Expiring within 30 days</h2>
          {!loading && alerts.expiring.length === 0 && <p className="muted">No products are close to expiry.</p>}
          <ul className="alert-list">
            {alerts.expiring.map((p) => (
              <li key={p._id}>
                <ProductImage product={p} size={36} />
                <span className="alert-list-name">
                  {p.name}
                  <small className="muted"> · {formatDate(p.expiryDate)}</small>
                </span>
                <span className={expiryStatus(p) === 'expired' ? 'badge badge-red' : 'badge badge-orange'}>
                  {expiryLabel(p)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
