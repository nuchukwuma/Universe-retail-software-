import { useId, useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';

// A manager or owner types their username and password on the cashier's
// till to approve something (a large discount, a return).
// Calls onApproved({ token, approverName }) when the password is right.
// "formId" lets a dialog footer hold the Approve button.
export function ManagerApprovalForm({ reason, onApproved, formId }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Sends the manager's details to the server to check them.
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/approve', { username, password });
      onApproved({ token: data.approvalToken, approverName: data.approverName });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form id={formId} className="stack" onSubmit={handleSubmit}>
      <p>{reason}</p>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="field">
        <label className="field-label" htmlFor={`${formId}-user`}>Manager's username</label>
        <input id={`${formId}-user`} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required autoComplete="off" />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${formId}-pass`}>Manager's password</label>
        <input id={`${formId}-pass`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
      </div>
    </form>
  );
}

// The approval form in its own dialog.
export function ManagerApprovalModal({ reason, onApproved, onClose }) {
  const formId = useId();
  return (
    <Modal
      title="A manager must approve this"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn push-left" onClick={onClose}>Cancel</button>
          <button type="submit" form={formId} className="btn btn-primary">Approve</button>
        </>
      }
    >
      <ManagerApprovalForm reason={reason} onApproved={onApproved} formId={formId} />
    </Modal>
  );
}
