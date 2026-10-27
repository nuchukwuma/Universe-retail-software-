// Friendly names for each role, used on screen.
export const ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
};

// Returns true if the user's role is one of the allowed roles.
// Example: hasRole(user, ['owner', 'manager'])
export function hasRole(user, allowedRoles) {
  return Boolean(user) && allowedRoles.includes(user.role);
}

// Returns true for staff who can open the back office (not cashiers).
export function canUseBackOffice(user) {
  return hasRole(user, ['owner', 'manager']);
}
