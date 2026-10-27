const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// The three staff roles. Owner can do everything, Manager handles
// inventory and reports, Cashier can only use the checkout.
const ROLES = ['owner', 'manager', 'cashier'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'cashier' },
    isActive: { type: Boolean, default: true },
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

// Removes the password hash whenever a user is sent back as JSON.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
