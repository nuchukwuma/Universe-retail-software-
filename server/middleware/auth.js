const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Checks the "Authorization: Bearer <token>" header.
// If the token is valid, the logged-in user is saved on req.user.
async function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Your account is not active. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

// Allows the request only if the user has one of the given roles.
// Example: requireRole('owner', 'manager')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
