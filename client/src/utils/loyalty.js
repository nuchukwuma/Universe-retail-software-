// Loyalty points, worked out the same way as the server (server/utils/loyalty.js).

// How much spending "points" takes off a bill of "total" (never more than
// the bill), and how many points that really uses.
export function pointsDiscount(settings, points, total) {
  const value = Number(settings.loyaltyPointValue) || 0;
  const wanted = Math.max(0, Math.floor(Number(points) || 0));
  if (!settings.loyaltyEnabled || value <= 0 || wanted === 0 || total <= 0) return { points: 0, amount: 0 };
  const usable = Math.min(wanted, Math.floor(total / value));
  return { points: usable, amount: Math.round(usable * value * 100) / 100 };
}

// Points a customer earns on paying "amount".
export function pointsEarned(settings, amount) {
  const every = Number(settings.loyaltyEarnEvery) || 0;
  if (!settings.loyaltyEnabled || every <= 0 || amount <= 0) return 0;
  return Math.floor(amount / every);
}
