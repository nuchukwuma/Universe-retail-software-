const jwt = require('jsonwebtoken');
const User = require('../models/User');

const APPROVER_ROLES = ['owner', 'manager'];

// Creates a short-lived "manager approval" token. A cashier's till sends
// it with a large discount or a return to prove a manager agreed.
function createApprovalToken(manager) {
  return jwt.sign({ userId: manager._id, kind: 'approval' }, process.env.JWT_SECRET, { expiresIn: '30m' });
}

// Returns the manager/owner who approved this request, or null.
// - A logged-in manager or owner approves their own actions.
// - A cashier must send an approvalToken from a manager's password check.
async function findApprover(req) {
  if (APPROVER_ROLES.includes(req.user.role)) {
    return req.user;
  }

  const token = req.body.approvalToken;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.kind !== 'approval') return null;

    const manager = await User.findById(payload.userId);
    if (manager && manager.isActive && APPROVER_ROLES.includes(manager.role)) {
      return manager;
    }
  } catch (error) {
    // expired or fake token - fall through
  }
  return null;
}

module.exports = { APPROVER_ROLES, createApprovalToken, findApprover };
