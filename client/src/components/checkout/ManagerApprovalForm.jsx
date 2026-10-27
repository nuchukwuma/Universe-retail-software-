import { useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';

// A small form where a manager or owner types their username and password
// on the cashier's till to approve something (large discount, return).
// Calls onApproved({ token, approverName }) when the password is right.
export function ManagerApprovalForm({ reason, onApproved, onCancel }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // Sends the manager's details to the server to check them.
  async function handleSubmit(event) {
    event.preventDefault();
    setChecking(true);
    setError('');
    try {
      const data = await api.post('/auth/approve', { username, password });
      onApproved({ token: data.approvalToken, approverName: data.approverName });
    } catch (err) {
      setError(err.message);
      setChecking(false);
    }
  }

  return (
    <form className="approval-form" onSubmit={handleSubmit}>
      <p className="approval-reason">🔒 {reason}</p>
      {error && <div className="alert alert-error">{error}</div>}
      <label>
        Manager username
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required autoComplete="off" />
      </label>
      <label>
        Manager password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={checking}>
          {checking ? 'Checking...' : 'Approve'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// The same form inside its own pop-up box.
export function ManagerApprovalModal({ reason, onApproved, onClose }) {
  return (
    <Modal title="Manager approval needed" onClose={onClose}>
      <ManagerApprovalForm reason={reason} onApproved={onApproved} onCancel={onClose} />
    </Modal>
  );
}
