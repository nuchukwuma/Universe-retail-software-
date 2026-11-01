import { useState } from 'react';
import { api } from '../api/api';
import { desktop } from '../utils/desktop';
import { formatDateTime } from '../utils/dates';

const REASONS = { manual: 'Made by hand', automatic: 'Daily backup', 'before-restore': 'Before a restore', 'before-update': 'Before an update', import: 'Brought over from an older version' };

// First start only: bring the shop's data back from a backup (e.g. on a USB
// drive, or one brought over from an older version of the app) instead of
// starting with an empty shop.
function RestoreBackupForm({ onDone, onCancel }) {
  const [folder, setFolder] = useState('');
  const [backups, setBackups] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Lists the backups in the folder.
  async function findBackups(chosenFolder = folder) {
    setError('');
    setBusy(true);
    try {
      const data = await api.get(`/setup/backups?folder=${encodeURIComponent(chosenFolder)}`);
      setFolder(data.folder);
      setBackups(data.backups);
    } catch (err) {
      setBackups(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Opens the "choose folder" window (desktop app only).
  async function chooseFolder() {
    const chosen = await desktop.chooseFolder();
    if (chosen) {
      setFolder(chosen);
      findBackups(chosen);
    }
  }

  // Restores one backup, after asking.
  async function restore(backup) {
    if (!window.confirm(`Restore the backup from ${formatDateTime(backup.createdAt)}? The shop's data will be what it was then.`)) return;
    setError('');
    setBusy(true);
    try {
      const data = await api.post('/setup/restore', { folder, name: backup.name });
      onDone(data.message);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="entry-form" onSubmit={(e) => { e.preventDefault(); findBackups(); }}>
      <h2>Restore from a backup</h2>
      <p className="muted">
        Moving to this computer, or bringing data from an older version of the app? Choose the folder that
        holds the <strong>universe-pos-backup-...</strong> folders (for example your USB drive).
      </p>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="field">
        <label className="field-label" htmlFor="restore-folder">Folder with the backups</label>
        <input id="restore-folder" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="e.g. E:\Shop Backups" required />
      </div>
      <div className="btn-row">
        {desktop && <button type="button" className="btn" onClick={chooseFolder} disabled={busy}>Choose folder</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && !backups ? 'Looking...' : 'Find backups'}</button>
      </div>

      {backups && backups.length === 0 && <p className="muted">No backups in this folder. Choose the folder that holds the universe-pos-backup-... folders.</p>}
      {backups && backups.length > 0 && (
        <ul className="restore-list" aria-label="Backups found">
          {backups.map((backup) => (
            <li key={backup.name}>
              <span>
                <span className="strong">{formatDateTime(backup.createdAt)}</span>
                <span className="muted small"> {REASONS[backup.reason] || backup.reason}, {backup.records} records</span>
              </span>
              <button type="button" className="btn btn-small" onClick={() => restore(backup)} disabled={busy}>
                Restore<span className="visually-hidden"> the backup from {formatDateTime(backup.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>Set up a new shop instead</button>
    </form>
  );
}

export default RestoreBackupForm;
