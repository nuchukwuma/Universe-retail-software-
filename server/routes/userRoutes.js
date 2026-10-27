const express = require('express');
const User = require('../models/User');
const { ROLES } = require('../models/User');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every route in this file needs a logged-in Owner.
router.use(requireLogin, requireRole('owner'));

// GET /api/users
// Lists all staff accounts, newest first.
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Could not load staff list.' });
  }
});

// POST /api/users
// Creates a new staff account.
router.post('/', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Name, username and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ message: 'Unknown role.' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'That username is already taken.' });
    }

    const user = new User({ name, username, role: role || 'cashier' });
    await user.setPassword(password);
    await user.save();

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Could not create staff account.' });
  }
});

// PUT /api/users/:id
// Updates a staff member's name, role, active status or password.
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    const { name, role, isActive, password } = req.body;
    const isSelf = user._id.equals(req.user._id);

    // Stop the owner from locking themselves out by mistake.
    if (isSelf && (role && role !== 'owner')) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }
    if (isSelf && isActive === false) {
      return res.status(400).json({ message: 'You cannot disable your own account.' });
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ message: 'Unknown role.' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) await user.setPassword(password);

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Could not update staff account.' });
  }
});

// DELETE /api/users/:id
// Deletes a staff account (you cannot delete yourself).
router.delete('/:id', async (req, res) => {
  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    res.json({ message: 'Staff account deleted.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Could not delete staff account.' });
  }
});

module.exports = router;
