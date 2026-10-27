import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { formatDateTime } from '../utils/dates';
import { desktop } from '../utils/desktop';

const REASON_LABELS = { manual: 'Made by hand', automatic: 'Automatic (daily)', 'before-restore': 'Safety copy before a restore' };

// Turns a number of bytes into "2.4 MB".
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Owner-only page: where backups are saved, "Back up now", and restore.
// All data lives only on this laptop, so backups are the shop's safety net.
function BackupPage() {
  const { logout } = useAuth();
  const [info, setInfo] = useState(null);
  const [folder, setFolder] = useState('');
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  // Load the backup information when the page opens.
  useEffect(() => {
    loadInfo();
  }, []);

  // Fetches the folder, last backup time and list of backups.
  async function loadInfo() {
    try {
      const data = await api.get('/backups');
      setInfo(data);
      setFolder(data.folder === data.defaultFolder ? '' : data.folder);
    } catch (err) {
      setError(err.message);
    }
  }

  // Runs one action, shows its result and reloads the page data.
  async function run(name, action) {
    setWorking(name);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking('');
      loadInfo();
    }
  }

  // Opens the Windows "choose folder" window (desktop app only).
  async function chooseFolder() {
    const chosen = await desktop.chooseFolder();
    if (chosen) setFolder(chosen);
  }

  // Replaces all data with the chosen backup, then logs out.
  function restore() {
    run('restore', async () => {
      await api.post('/backups/restore', { name: restoreTarget.name, confirm: confirmText });
      setRestoreTarget(null);
      window.alert('The backup has been restored. Please log in again.');
      logout();
    });
  }

  if (!info) return <p className="muted">{error || 'Loading backups...'}</p>;

  const daysSinceBackup = info.lastBackupAt ? (Date.now() - new Date(info.lastBackupAt)) / 86400000 : null;

  return (
    <div>
      <h1 className="page-title">Backup &amp; Restore</h1>
      <p className="muted">
        All the shop's data is kept only on this laptop. Backups protect it if the laptop breaks, is stolen or the hard
        disk fails. For real safety, save backups to a <strong>USB drive or external disk</strong> and keep it away from
        the laptop.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {info.lastBackupError && <div className="alert alert-error">Last backup problem: {info.lastBackupError}</div>}

      <div className="stat-cards">
        <div className={`stat-card ${daysSinceBackup === null || daysSinceBackup > 2 ? 'stat-card-red' : 'stat-card-green'}`}>
          <span>Last backup</span>
          <strong>{info.lastBackupAt ? formatDateTime(info.lastBackupAt) : 'Never'}</strong>
          <small>{info.autoBackupEnabled ? 'An automatic backup is made once a day.' : 'Automatic backups are OFF.'}</small>
        </div>
      </div>

      <div className="card form-grid">
        <h3 className="form-section">Where backups are saved</h3>
        <label className="span-2">
          Backup folder
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder={`${info.defaultFolder} (on this laptop)`}
          />
        </label>
        <div className="form-actions">
          {desktop && <button type="button" className="btn" onClick={chooseFolder}>📁 Choose folder…</button>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(working)}
            onClick={() => run('folder', async () => setMessage((await api.put('/backups/settings', { folder })).message))}
          >
            Save folder
          </button>
        </div>
        <label className="checkbox-row span-full">
          <input
            type="checkbox"
            checked={info.autoBackupEnabled}
            onChange={(e) => run('auto', () => api.put('/backups/settings', { autoBackupEnabled: e.target.checked }))}
          />
          Make an automatic backup once a day (the newest 30 are kept)
        </label>
        <p className="span-full muted small">Saving to: {info.folder}</p>
      </div>

      <div className="card">
        <div className="page-header">
          <h2>Backups</h2>
          <div className="actions">
            {desktop && <button type="button" className="btn" onClick={() => desktop.openFolder(info.folder)}>Open folder</button>}
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(working)}
              onClick={() => run('backup', async () => setMessage((await api.post('/backups')).message))}
            >
              {working === 'backup' ? 'Backing up...' : '💾 Back up now'}
            </button>
          </div>
        </div>

        {info.backups.length === 0 ? (
          <p className="muted">No backups in this folder yet. Click "Back up now".</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Made on</th>
                  <th>Type</th>
                  <th className="number">Records</th>
                  <th className="number">Size</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {info.backups.map((backup) => (
                  <tr key={backup.name}>
                    <td>{formatDateTime(backup.createdAt)}</td>
                    <td>{REASON_LABELS[backup.reason] || backup.reason}</td>
                    <td className="number">{backup.records.toLocaleString('en-NG')}</td>
                    <td className="number">{formatSize(backup.sizeBytes)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => {
                          setRestoreTarget(backup);
                          setConfirmText('');
                        }}
                      >
                        Restore…
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restoreTarget && (
        <Modal title="Restore this backup?" onClose={() => setRestoreTarget(null)}>
          <div className="alert alert-error">
            This replaces <strong>ALL</strong> the current data (sales, products, staff, settings) with the backup from{' '}
            <strong>{formatDateTime(restoreTarget.createdAt)}</strong>. Anything done after that time will be gone.
          </div>
          <p className="small">
            To be safe, a copy of the current data is saved first ("Safety copy before a restore"), so you can undo this.
          </p>
          <label>
            Type RESTORE to confirm
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-danger" disabled={confirmText !== 'RESTORE' || Boolean(working)} onClick={restore}>
              {working === 'restore' ? 'Restoring...' : 'Restore backup'}
            </button>
            <button type="button" className="btn" onClick={() => setRestoreTarget(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BackupPage;
