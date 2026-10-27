const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Creates a signed login token (JWT) that holds the user's id and role.
function createToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

// POST /api/auth/login
// Checks the username and password and returns a token plus the user.
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Enter your username and password.' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    const passwordIsCorrect = user ? await user.checkPassword(password) : false;

    if (!user || !passwordIsCorrect) {
      return res.status(401).json({ message: 'Wrong username or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been disabled. Speak to the owner.' });
    }

    res.json({ token: createToken(user), user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/auth/me
// Returns the currently logged-in user (used to check a saved token).
router.get('/me', requireLogin, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/change-password
// Lets any logged-in user change their own password.
router.put('/change-password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const isCorrect = await req.user.checkPassword(currentPassword || '');
    if (!isCorrect) {
      return res.status(400).json({ message: 'Your current password is wrong.' });
    }

    await req.user.setPassword(newPassword);
    await req.user.save();
    res.json({ message: 'Password changed.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Could not change password.' });
  }
});

module.exports = router;
