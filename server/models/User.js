const db = require('../db');
const bcrypt = require('bcryptjs');

// The three staff roles. Owner can do everything, Manager handles
// inventory and reports, Cashier can only use the checkout.
const ROLES = ['owner', 'manager', 'cashier'];

// One password-recovery question and its answer. The answer is stored
// scrambled (like the password), never as text.
const securityQuestionSchema = new db.Schema(
  {
    question: { type: String, required: true, trim: true },
    answerHash: { type: String, required: true },
  },
  { _id: false }
);

// Makes an answer comparable however it is typed: "  Lagos " = "lagos".
function normaliseAnswer(answer) {
  return String(answer || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const userSchema = new db.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'cashier' },
    isActive: { type: Boolean, default: true },
    // The owner's three questions for "Forgot your password?"
    securityQuestions: [securityQuestionSchema],
    // Wrong answers in a row, and when answering may start again after too many.
    recoveryFailedAttempts: { type: Number, default: 0 },
    recoveryLockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Turns a plain password into a bcrypt hash and saves it on the user.
userSchema.methods.setPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 10);
};

// Returns true if the plain password matches the saved hash.
userSchema.methods.checkPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Saves the security questions, with each answer scrambled.
// "list" is [{ question, answer }, ...].
userSchema.methods.setSecurityQuestions = async function (list) {
  this.securityQuestions = await Promise.all(list.map(async ({ question, answer }) => ({
    question: String(question).trim(),
    answerHash: await bcrypt.hash(normaliseAnswer(answer), 10),
  })));
  this.recoveryFailedAttempts = 0;
  this.recoveryLockedUntil = null;
};

// Returns true if every answer (in the same order as the questions) is right.
userSchema.methods.checkSecurityAnswers = async function (answers) {
  const questions = this.securityQuestions || [];
  if (!Array.isArray(answers) || questions.length === 0 || answers.length !== questions.length) return false;
  const results = await Promise.all(questions.map((q, i) => bcrypt.compare(normaliseAnswer(answers[i]), q.answerHash)));
  return results.every(Boolean);
};

// Removes the password hash and the security answers whenever a user is
// sent back as JSON. "hasSecurityQuestions" says whether they are set.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.hasSecurityQuestions = Array.isArray(ret.securityQuestions) && ret.securityQuestions.length === 3;
    delete ret.passwordHash;
    delete ret.securityQuestions;
    delete ret.recoveryFailedAttempts;
    delete ret.recoveryLockedUntil;
    delete ret.__v;
    return ret;
  },
});

const User = db.model('User', userSchema, 'users');

module.exports = User;
module.exports.ROLES = ROLES;
