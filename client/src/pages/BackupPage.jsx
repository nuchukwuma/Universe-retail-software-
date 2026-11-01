import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { formatDateTime } from '../utils/dates';
import { desktop } from '../utils/desktop';

const REASON_LABELS = {
  manual: 'Made by hand',
  automatic: 'Automatic (daily)',
  'before-restore': 'Safety copy before a restore',
  'before-update': 'Safety copy before an app update',
};

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

  if (!info) {
    return error ? <div className="notice notice-error" role="alert">{error}</div> : <p className="loading">Loading backups...</p>;
  }

  const daysSinceBackup = info.lastBackupAt ? (Date.now() - new Date(info.lastBackupAt)) / 86400000 : null;
  const backupOverdue = daysSinceBackup === null || daysSinceBackup > 2;

  return (
    <div className="page">
      <PageHeader title="Backup and restore" lead="The shop's data is only on this laptop. Keep backups on a USB drive, away from the laptop, so a broken or stolen laptop loses nothing.">
        <button type="button" className="btn btn-primary" disabled={Boolean(working)} onClick={() => run('backup', async () => setMessage((await api.post('/backups')).message))}>
          {working === 'backup' ? 'Backing up...' : 'Back up now'}
        </button>
      </PageHeader>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}
      {info.lastBackupError && <div className="notice notice-error"><span className="notice-title">The last backup failed</span>{info.lastBackupError}</div>}

      <dl className="figures">
        <div className="figure">
          <dt>Last backup</dt>
          <dd className={backupOverdue ? 'danger-text' : undefined}>
            {info.lastBackupAt ? formatDateTime(info.lastBackupAt) : 'Never'}
            <span className="figure-note muted">{info.autoBackupEnabled ? 'A backup is made by itself once a day.' : 'Automatic backups are off.'}</span>
          </dd>
        </div>
        <div className="figure">
          <dt>Backups in the folder</dt>
          <dd>{info.backups.length}</dd>
        </div>
      </dl>

      <section className="panel form-grid" aria-labelledby="backup-folder-heading">
        <h2 id="backup-folder-heading" className="form-section">Where backups are saved</h2>
        <div className="field span-all">
          <label className="field-label" htmlFor="backup-folder">Backup folder</label>
          <input id="backup-folder" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder={`${info.defaultFolder} (on this laptop)`} />
          <span className="field-help">Saving to: {info.folder}</span>
        </div>
        <div className="span-all btn-row">
          {desktop && <button type="button" className="btn" onClick={chooseFolder}>Choose folder</button>}
          {desktop && <button type="button" className="btn" onClick={() => desktop.openFolder(info.folder)}>Open the folder</button>}
          <button type="button" className="btn btn-primary" disabled={Boolean(working)} onClick={() => run('folder', async () => setMessage((await api.put('/backups/settings', { folder })).message))}>
            Save folder
          </button>
        </div>
        <label className="check span-all">
          <input type="checkbox" checked={info.autoBackupEnabled} onChange={(e) => run('auto', () => api.put('/backups/settings', { autoBackupEnabled: e.target.checked }))} />
          Make a backup by itself once a day (the newest 30 are kept)
        </label>
      </section>

      <section className="panel panel-flush" aria-labelledby="backup-list-heading">
        <div className="panel-head"><h2 id="backup-list-heading">Backups</h2></div>
        {info.backups.length === 0 ? (
          <p className="empty muted">No backups in this folder yet. Press "Back up now".</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Made on</th>
                  <th>Kind</th>
                  <th className="num">Records</th>
                  <th className="num">Size</th>
                  <th><span className="visually-hidden">Restore</span></th>
                </tr>
              </thead>
              <tbody>
                {info.backups.map((backup) => (
                  <tr key={backup.name}>
                    <td className="cell-main">{formatDateTime(backup.createdAt)}</td>
                    <td>{REASON_LABELS[backup.reason] || backup.reason}</td>
                    <td className="num">{backup.records.toLocaleString('en-NG')}</td>
                    <td className="num">{formatSize(backup.sizeBytes)}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-quiet btn-danger" onClick={() => { setRestoreTarget(backup); setConfirmText(''); }}>
                        Restore<span className="visually-hidden"> the backup from {formatDateTime(backup.createdAt)}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {restoreTarget && (
        <Modal
          title="Restore this backup?"
          onClose={() => setRestoreTarget(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRestoreTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-danger-solid" disabled={confirmText !== 'RESTORE' || Boolean(working)} onClick={restore}>
                {working === 'restore' ? 'Restoring...' : 'Restore backup'}
              </button>
            </>
          }
        >
          <div className="notice notice-error">
            This replaces all the current data (sales, products, staff, settings) with the backup from{' '}
            <strong>{formatDateTime(restoreTarget.createdAt)}</strong>. Anything done after that time will be gone.
          </div>
          <p>A copy of the current data is saved first ("Safety copy before a restore"), so this can be undone.</p>
          <div className="field">
            <label className="field-label" htmlFor="restore-confirm">Type RESTORE to confirm</label>
            <input id="restore-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus autoComplete="off" />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default BackupPage;
