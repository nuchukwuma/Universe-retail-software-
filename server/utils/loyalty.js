// Loyalty points (switched on in Settings):
//   earned   = 1 point for every "loyaltyEarnEvery" Naira paid (rounded down)
//   spending = each point takes "loyaltyPointValue" Naira off a bill
const { roundMoney } = require('./saleCalculations');

// A phone number in one shape, so "0803 123 4567" and "08031234567" match.
function cleanPhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

function pointsEarned(settings, amountPaid) {
  const every = Number(settings.loyaltyEarnEvery) || 0;
  if (!settings.loyaltyEnabled || every <= 0 || amountPaid <= 0) return 0;
  return Math.floor(amountPaid / every);
}

// How much spending "points" takes off a bill of "total" (never more than
// the bill), and how many points that really uses.
function pointsDiscount(settings, points, total) {
  const value = Number(settings.loyaltyPointValue) || 0;
  const wanted = Math.max(0, Math.floor(Number(points) || 0));
  if (!settings.loyaltyEnabled || value <= 0 || wanted === 0 || total <= 0) return { points: 0, amount: 0 };
  const usable = Math.min(wanted, Math.floor(total / value));
  return { points: usable, amount: roundMoney(usable * value) };
}

module.exports = { cleanPhone, pointsEarned, pointsDiscount };
