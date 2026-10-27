import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/roles';

const EMPTY_FORM = { name: '', username: '', password: '', role: 'cashier' };

// Owner-only page for adding staff, changing roles, resetting
// passwords and disabling or deleting accounts.
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
      const data = await api.get('/users');
      setStaff(data);
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

  // Saves a change (role, active status or password) for one staff member.
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
    if (newPassword) {
      updateStaff(member, { password: newPassword }, `Password changed for ${member.name}.`);
    }
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
    <div>
      <h1 className="page-title">Staff Accounts</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="card form-grid" onSubmit={handleAddStaff}>
        <h2 className="form-grid-title">Add a staff member</h2>
        <label>
          Full name
          <input name="name" value={form.name} onChange={handleFormChange} required />
        </label>
        <label>
          Username
          <input name="username" value={form.username} onChange={handleFormChange} required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={6}
            value={form.password}
            onChange={handleFormChange}
            required
          />
        </label>
        <label>
          Role
          <select name="role" value={form.role} onChange={handleFormChange}>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Add Staff'}
        </button>
      </form>

      <div className="card">
        {loading ? (
          <p className="muted">Loading staff...</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const isMe = member._id === currentUser._id;
                  return (
                    <tr key={member._id}>
                      <td>{member.name}{isMe && <span className="muted"> (you)</span>}</td>
                      <td>{member.username}</td>
                      <td>
                        <select
                          value={member.role}
                          disabled={isMe}
                          onChange={(e) =>
                            updateStaff(member, { role: e.target.value }, `${member.name} is now ${ROLE_LABELS[e.target.value]}.`)
                          }
                        >
                          <option value="cashier">Cashier</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>
                      <td>
                        <span className={member.isActive ? 'badge badge-green' : 'badge badge-grey'}>
                          {member.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button type="button" className="btn btn-small" onClick={() => handleResetPassword(member)}>
                            Reset password
                          </button>
                          {!isMe && (
                            <>
                              <button
                                type="button"
                                className="btn btn-small"
                                onClick={() =>
                                  updateStaff(
                                    member,
                                    { isActive: !member.isActive },
                                    `${member.name} was ${member.isActive ? 'disabled' : 'enabled'}.`
                                  )
                                }
                              >
                                {member.isActive ? 'Disable' : 'Enable'}
                              </button>
                              <button type="button" className="btn btn-small btn-danger" onClick={() => handleDelete(member)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffPage;
