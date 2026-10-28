import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { ROLE_LABELS } from '../utils/roles';

const EMPTY_FORM = { name: '', username: '', password: '', role: 'cashier' };

// Owner only: add staff, change roles, reset passwords, and switch
// accounts off or delete them.
function StaffPage() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load the staff list when the page opens.
  useEffect(() => {
    loadStaff();
  }, []);

  // Fetches all staff accounts from the server.
  async function loadStaff() {
    setLoading(true);
    try {
      setStaff(await api.get('/users'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Shows a success message, or an error message if "isError" is true.
  function showResult(text, isError = false) {
    setMessage(isError ? '' : text);
    setError(isError ? text : '');
  }

  // Updates one field of the "Add staff" form.
  function handleFormChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Creates a new staff account from the form.
  async function handleAddStaff(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const newUser = await api.post('/users', form);
      setStaff([newUser, ...staff]);
      setForm(EMPTY_FORM);
      showResult(`Account created for ${newUser.name}.`);
    } catch (err) {
      showResult(err.message, true);
    } finally {
      setSaving(false);
    }
  }

  // Saves a change (role, active or password) for one staff member.
  async function updateStaff(member, changes, successText) {
    try {
      const updated = await api.put(`/users/${member._id}`, changes);
      setStaff(staff.map((s) => (s._id === updated._id ? updated : s)));
      showResult(successText);
    } catch (err) {
      showResult(err.message, true);
    }
  }

  // Asks for a new password and saves it.
  function handleResetPassword(member) {
    const newPassword = window.prompt(`New password for ${member.name} (at least 6 characters):`);
    if (newPassword) updateStaff(member, { password: newPassword }, `Password changed for ${member.name}.`);
  }

  // Deletes a staff account after confirming.
  async function handleDelete(member) {
    if (!window.confirm(`Delete the account for ${member.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${member._id}`);
      setStaff(staff.filter((s) => s._id !== member._id));
      showResult(`${member.name} was deleted.`);
    } catch (err) {
      showResult(err.message, true);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Staff" lead="Everyone who can sign in to the till, and what they are allowed to do." />

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <section className="panel panel-flush" aria-label="Staff accounts">
        {loading && <p className="loading">Loading staff...</p>}
        {!loading && staff.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Account</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const isMe = member._id === currentUser._id;
                  return (
                    <tr key={member._id}>
                      <td className="cell-main">{member.name}{isMe && <span className="muted"> (you)</span>}</td>
                      <td>{member.username}</td>
                      <td>
                        <select
                          className="input-auto"
                          value={member.role}
                          disabled={isMe}
                          aria-label={`Role of ${member.name}`}
                          onChange={(e) => updateStaff(member, { role: e.target.value }, `${member.name} is now a ${ROLE_LABELS[e.target.value].toLowerCase()}.`)}
                        >
                          <option value="cashier">Cashier</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>
                      <td><span className={member.isActive ? 'status status-ok' : 'status status-quiet'}>{member.isActive ? 'Can sign in' : 'Switched off'}</span></td>
                      <td className="actions">
                        <button type="button" className="btn btn-quiet" onClick={() => handleResetPassword(member)}>Reset password</button>
                        {!isMe && (
                          <>
                            <button
                              type="button"
                              className="btn btn-quiet"
                              onClick={() => updateStaff(member, { isActive: !member.isActive }, `${member.name} ${member.isActive ? 'can no longer sign in' : 'can sign in again'}.`)}
                            >
                              {member.isActive ? 'Switch off' : 'Switch on'}
                            </button>
                            <button type="button" className="btn btn-quiet btn-danger" onClick={() => handleDelete(member)}>
                              Delete<span className="visually-hidden"> {member.name}</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form className="panel form-grid" onSubmit={handleAddStaff}>
        <h2 className="form-section">Add a staff member</h2>
        <div className="field">
          <label className="field-label" htmlFor="staff-name">Full name</label>
          <input id="staff-name" name="name" value={form.name} onChange={handleFormChange} required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="staff-username">Username</label>
          <input id="staff-username" name="username" value={form.username} onChange={handleFormChange} required autoComplete="off" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="staff-password">Password</label>
          <input id="staff-password" name="password" type="password" minLength={6} value={form.password} onChange={handleFormChange} required autoComplete="new-password" />
          <span className="field-help">At least 6 characters.</span>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="staff-role">Role</label>
          <select id="staff-role" name="role" value={form.role} onChange={handleFormChange}>
            <option value="cashier">Cashier: sells, sees their own sales</option>
            <option value="manager">Manager: also stock, reports, returns, any discount</option>
            <option value="owner">Owner: everything, including staff and settings</option>
          </select>
        </div>
        <div className="span-all btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add staff member'}</button>
        </div>
      </form>
    </div>
  );
}

export default StaffPage;
