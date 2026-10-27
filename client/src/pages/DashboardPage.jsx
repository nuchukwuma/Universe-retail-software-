import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ProductImage from '../components/ProductImage';
import { ROLE_LABELS } from '../utils/roles';
import { formatDate, todayDateValue } from '../utils/dates';
import { formatNaira } from '../utils/formatNaira';
import { expiryLabel, expiryStatus } from '../utils/stockAlerts';

// Compares today with yesterday, e.g. "▲ 12% vs yesterday (₦40,000)".
function compareWithYesterday(today, yesterday) {
  if (!yesterday) return `Yesterday: ${formatNaira(0)}`;
  const change = Math.round(((today - yesterday) / yesterday) * 100);
  const arrow = change >= 0 ? '▲' : '▼';
  return `${arrow} ${Math.abs(change)}% vs yesterday (${formatNaira(yesterday)})`;
}

// Back office home page for managers and owners: today's sales cards,
// this month so far, and stock alerts.
function DashboardPage() {
  const { user } = useAuth();
  const { settings, reloadSettings } = useSettings();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState({ lowStock: [], expiring: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the sales numbers and the stock alerts when the page opens.
  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboard, stockAlerts] = await Promise.all([api.get('/reports/dashboard'), api.get('/products/alerts')]);
        setStats(dashboard);
        setAlerts(stockAlerts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Re-read the settings so the backup warning below is up to date.
  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const expiredCount = alerts.expiring.filter((p) => expiryStatus(p) === 'expired').length;
  const daysSinceBackup = settings.lastBackupAt ? (Date.now() - new Date(settings.lastBackupAt)) / 86400000 : null;
  const backupWarning =
    user.role === 'owner' && (settings.lastBackupError || daysSinceBackup === null || daysSinceBackup > 2);
  const today = todayDateValue();
  const show = (value) => (loading || !stats ? '…' : value);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="muted">Welcome, {user.name} ({ROLE_LABELS[user.role]}). Here is how the shop is doing today.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {backupWarning && (
        <div className="alert alert-error backup-warning">
          💾 {settings.lastBackupError
            ? `The last backup failed: ${settings.lastBackupError}`
            : daysSinceBackup === null
              ? 'No backup has been made yet.'
              : `The last backup was ${Math.floor(daysSinceBackup)} days ago.`}{' '}
          <Link to="/backup">Open Backup &amp; Restore</Link>
        </div>
      )}

      <div className="stat-cards">
        <Link to={`/reports?report=daily&from=${today}&to=${today}`} className="stat-card">
          <span>Today's sales</span>
          <strong>{show(formatNaira(stats?.today.netSales))}</strong>
          <small>{stats && compareWithYesterday(stats.today.netSales, stats.yesterday.netSales)}</small>
        </Link>
        <Link to={`/reports?report=cashiers&from=${today}&to=${today}`} className="stat-card">
          <span>Transactions today</span>
          <strong>{show(stats?.today.transactions)}</strong>
          <small>{stats && `${stats.today.itemsSold} items · average ${formatNaira(stats.today.averageSale)}`}</small>
        </Link>
        <Link to={`/reports?report=profit&from=${today}&to=${today}`} className="stat-card stat-card-green">
          <span>Profit today</span>
          <strong>{show(formatNaira(stats?.today.profit))}</strong>
          <small>after discounts, refunds and cost of goods</small>
        </Link>
        <Link to="/products?filter=low" className="stat-card stat-card-red">
          <span>Low stock</span>
          <strong>{show(stats?.lowStock)}</strong>
          <small>products at or below reorder level</small>
        </Link>
      </div>

      <div className="stat-cards">
        <Link to={`/reports?report=daily&from=${today.slice(0, 8)}01&to=${today}`} className="stat-card">
          <span>This month so far</span>
          <strong>{show(formatNaira(stats?.month.netSales))}</strong>
          <small>{stats && `${stats.month.transactions} sales · profit ${formatNaira(stats.month.profit)}`}</small>
        </Link>
        <Link to="/products?filter=expiring" className="stat-card stat-card-orange">
          <span>Expiring soon</span>
          <strong>{show(stats?.expiring)}</strong>
          <small>{expiredCount > 0 ? `${expiredCount} already expired` : 'within the next 30 days'}</small>
        </Link>
        <Link to="/reports" className="stat-card stat-card-link">
          <span>All reports</span>
          <strong>📈</strong>
          <small>daily sales, cashiers, best sellers, profit, stock - with Excel export</small>
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
