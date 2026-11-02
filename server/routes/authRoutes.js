const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');
const { APPROVER_ROLES, createApprovalToken } = require('../utils/approval');
const { securityQuestionsProblem } = require('../utils/securityQuestions');

const MAX_WRONG_ANSWERS = 5; // then answering is paused...
const LOCK_MINUTES = 15; // ...for this long
const NO_RECOVERY = 'Security questions are only for the owner\'s account, once they have been set. Ask the owner to reset your password on the Staff page.';

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

// Finds the owner account that "Forgot your password?" is for, or null.
async function recoverableOwner(username) {
  const user = await User.findOne({ username: String(username || '').toLowerCase().trim() });
  const ok = user && user.isActive && user.role === 'owner' && (user.securityQuestions || []).length === 3;
  return ok ? user : null;
}

// Minutes left before answering is allowed again (0 = allowed now).
function minutesLocked(user) {
  const until = user.recoveryLockedUntil ? new Date(user.recoveryLockedUntil).getTime() : 0;
  return until > Date.now() ? Math.ceil((until - Date.now()) / 60000) : 0;
}

// GET /api/auth/recovery-questions?username=...
// "Forgot your password?": the owner's three questions (never the answers).
router.get('/recovery-questions', async (req, res) => {
  try {
    const user = await recoverableOwner(req.query.username);
    if (!user) return res.status(404).json({ message: NO_RECOVERY });
    res.json({ questions: user.securityQuestions.map((q) => q.question), lockedMinutes: minutesLocked(user) });
  } catch (error) {
    console.error('Recovery questions error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/recover
// "Forgot your password?": if all three answers are right, sets the new
// password and signs the owner in. After 5 wrong tries in a row, answering
// is paused for 15 minutes.
// Body: { username, answers: [a1, a2, a3], newPassword }
router.post('/recover', async (req, res) => {
  try {
    const { username, answers, newPassword } = req.body;
    const user = await recoverableOwner(username);
    if (!user) return res.status(404).json({ message: NO_RECOVERY });

    const locked = minutesLocked(user);
    if (locked) {
      return res.status(429).json({ message: `Too many wrong answers. Try again in ${locked} minute${locked === 1 ? '' : 's'}.` });
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'The new password must be at least 6 characters.' });
    }

    if (!(await user.checkSecurityAnswers(answers))) {
      user.recoveryFailedAttempts = (user.recoveryFailedAttempts || 0) + 1;
      const triesLeft = MAX_WRONG_ANSWERS - user.recoveryFailedAttempts;
      if (triesLeft <= 0) {
        user.recoveryFailedAttempts = 0;
        user.recoveryLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        await user.save();
        return res.status(429).json({ message: `Too many wrong answers. Try again in ${LOCK_MINUTES} minutes.` });
      }
      await user.save();
      return res.status(400).json({ message: `At least one answer is wrong. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left before a ${LOCK_MINUTES}-minute wait.` });
    }

    await user.setPassword(String(newPassword));
    user.recoveryFailedAttempts = 0;
    user.recoveryLockedUntil = null;
    await user.save();
    res.json({ message: 'Password changed.', token: createToken(user), user });
  } catch (error) {
    console.error('Recover password error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/auth/security-questions
// The owner sets or changes their three questions (needs their password).
// Body: { currentPassword, questions: [{ question, answer }, x3] }
router.put('/security-questions', requireLogin, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only the owner uses security questions. Others ask the owner to reset a forgotten password.' });
    }
    if (!(await req.user.checkPassword(req.body.currentPassword || ''))) {
      return res.status(400).json({ message: 'Your current password is wrong.' });
    }
    const problem = securityQuestionsProblem(req.body.questions);
    if (problem) return res.status(400).json({ message: problem });

    await req.user.setSecurityQuestions(req.body.questions);
    await req.user.save();
    res.json({ message: 'Security questions saved.', user: req.user });
  } catch (error) {
    console.error('Security questions error:', error);
    res.status(500).json({ message: 'Could not save the security questions.' });
  }
});

// POST /api/auth/approve
// A manager or owner types their username and password on the cashier's
// till to approve a large discount or a return. Returns an approval token
// (valid for 30 minutes) that the till sends with that action.
router.post('/approve', requireLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const manager = await User.findOne({ username: String(username || '').toLowerCase().trim() });
    const passwordIsCorrect = manager ? await manager.checkPassword(password || '') : false;

    // 400 (not 401): a wrong MANAGER password must not log the cashier out.
    if (!manager || !passwordIsCorrect || !manager.isActive) {
      return res.status(400).json({ message: 'Wrong manager username or password.' });
    }
    if (!APPROVER_ROLES.includes(manager.role)) {
      return res.status(403).json({ message: 'Only a manager or owner can approve this.' });
    }

    res.json({ approvalToken: createApprovalToken(manager), approverName: manager.name });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ message: 'Could not check approval.' });
  }
});

module.exports = router;
