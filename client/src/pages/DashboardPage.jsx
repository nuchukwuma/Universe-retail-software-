import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import PageHeader from '../components/PageHeader';
import { formatDate, shiftDate, todayDateValue } from '../utils/dates';
import { formatNaira } from '../utils/formatNaira';
import { stockStatus } from '../utils/stock';

// Says how today compares with yesterday, in words.
function compareWithYesterday(today, yesterday) {
  if (!yesterday) return `Nothing taken yesterday.`;
  const change = Math.round(((today - yesterday) / yesterday) * 100);
  if (change === 0) return `Same as yesterday (${formatNaira(yesterday)}).`;
  return `${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than yesterday (${formatNaira(yesterday)}).`;
}

// The back-office home page for managers and owners: today's takings,
// this week and month, what is running low, and what sold best today.
function DashboardPage() {
  const { user } = useAuth();
  const { settings, reloadSettings } = useSettings();
  const [stats, setStats] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [lastWeek, setLastWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = todayDateValue();
  const weekAgo = shiftDate(today, -6);

  // Load the numbers when the page opens.
  useEffect(() => {
    async function loadToday() {
      try {
        const [dashboard, best, daily] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get(`/reports/best-sellers?from=${today}&to=${today}`),
          api.get(`/reports/daily-sales?from=${weekAgo}&to=${today}`),
        ]);
        setStats(dashboard);
        setBestSellers(best.rows.slice(0, 5));
        setLastWeek(daily.rows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadToday();
  }, [today, weekAgo]);

  // Re-read the settings so the backup warning below is up to date.
  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  const daysSinceBackup = settings.lastBackupAt ? (Date.now() - new Date(settings.lastBackupAt)) / 86400000 : null;
  const backupWarning = user.role === 'owner' && (settings.lastBackupError || daysSinceBackup === null || daysSinceBackup > 2);

  return (
    <div className="page">
      <PageHeader title="Today" lead={`How the shop is doing on ${formatDate(today)}.`}>
        <Link to="/reports" className="btn">All reports</Link>
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {backupWarning && (
        <div className="notice notice-warning">
          <span className="notice-title">
            {settings.lastBackupError ? 'The last backup failed.' : daysSinceBackup === null ? 'No backup has been made yet.' : `The last backup was ${Math.floor(daysSinceBackup)} days ago.`}
          </span>
          {settings.lastBackupError || 'All the shop\'s data is only on this laptop. Make a backup to a USB drive.'}
          <div className="btn-row"><Link to="/backup" className="btn btn-small">Open Backup and restore</Link></div>
        </div>
      )}

      {loading && <p className="loading">Loading today's figures...</p>}

      {stats && (
        <dl className="figures">
          <Link to={`/reports?report=daily&from=${today}&to=${today}`} className="figure figure-link">
            <dt>Takings today</dt>
            <dd>{formatNaira(stats.today.takings)}<span className="figure-note muted">{compareWithYesterday(stats.today.takings, stats.yesterday.takings)}</span></dd>
          </Link>
          <Link to={`/reports?report=cashiers&from=${today}&to=${today}`} className="figure figure-link">
            <dt>Sales today</dt>
            <dd>{stats.today.transactions}<span className="figure-note muted">{stats.today.itemsSold} items, average {formatNaira(stats.today.averageSale)}</span></dd>
          </Link>
          <Link to={`/reports?report=daily&from=${stats.weekStart}&to=${today}`} className="figure figure-link">
            <dt>This week</dt>
            <dd>{formatNaira(stats.week.takings)}<span className="figure-note muted">since Monday, {stats.week.transactions} sales</span></dd>
          </Link>
          <Link to={`/reports?report=weekly&from=${today.slice(0, 8)}01&to=${today}`} className="figure figure-link">
            <dt>This month</dt>
            <dd>{formatNaira(stats.month.takings)}<span className="figure-note muted">{stats.month.transactions} sales so far</span></dd>
          </Link>
        </dl>
      )}

      {stats && (
        <div className="columns-even columns">
          <section className="panel panel-flush" aria-labelledby="low-heading">
            <div className="panel-head">
              <h2 id="low-heading">Running low</h2>
              <Link to="/products?filter=low" className="btn btn-quiet">See all {stats.lowStock}</Link>
            </div>
            {stats.lowStockProducts.length === 0 ? (
              <p className="empty muted">Every product is above its low-stock level.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">In stock</th>
                    <th className="num">Low at</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lowStockProducts.map((p) => {
                    const status = stockStatus(p);
                    return (
                      <tr key={p._id}>
                        <td className="cell-main">{p.name}</td>
                        <td className="num strong">{p.quantity}</td>
                        <td className="num muted">{p.reorderLevel}</td>
                        <td><span className={`status status-${status.key}`}>{status.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel panel-flush" aria-labelledby="best-heading">
            <div className="panel-head">
              <h2 id="best-heading">Best sellers today</h2>
              <Link to={`/reports?report=best-sellers&from=${today}&to=${today}`} className="btn btn-quiet">Full list</Link>
            </div>
            {bestSellers.length === 0 ? (
              <p className="empty muted">Nothing sold yet today.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Sold</th>
                    <th className="num">Sales value</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((row) => (
                    <tr key={row.product}>
                      <td className="cell-main">{row.name}</td>
                      <td className="num">{row.quantity}</td>
                      <td className="num">{formatNaira(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {stats && (
        <section className="panel panel-flush" aria-labelledby="week-heading">
          <div className="panel-head">
            <h2 id="week-heading">Last 7 days</h2>
            <Link to={`/reports?report=daily&from=${weekAgo}&to=${today}`} className="btn btn-quiet">Daily sales report</Link>
          </div>
          {lastWeek.length === 0 ? (
            <p className="empty muted">No sales in the last 7 days.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="num">Sales</th>
                  <th className="num">Items sold</th>
                  <th className="num">Takings</th>
                </tr>
              </thead>
              <tbody>
                {[...lastWeek].reverse().map((row) => (
                  <tr key={row.day} className={row.day === today ? 'is-highlighted' : undefined}>
                    <td className="cell-main">{row.day === today ? 'Today' : formatDate(row.day)}</td>
                    <td className="num">{row.transactions}</td>
                    <td className="num">{row.itemsSold}</td>
                    <td className="num strong">{formatNaira(row.takings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}

export default DashboardPage;
