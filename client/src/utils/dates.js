// Formats a date like "27 Oct 2026". Returns "" for an empty date.
export function formatDate(value) {
  if (!value) return '';
  // A plain "YYYY-MM-DD" is read as midday, so time zones never move it to the day before.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Formats a date and time like "27 Oct 2026, 2:30 pm".
export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Returns today's date as "YYYY-MM-DD" (this computer's local day),
// ready for an <input type="date">.
export function todayDateValue() {
  return new Date().toLocaleDateString('en-CA');
}

// Moves a "YYYY-MM-DD" date by a number of days, e.g. ('2026-10-27', -1) -> '2026-10-26'.
export function shiftDate(dateText, days) {
  const date = new Date(`${dateText}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA');
}

// Turns a saved date into "YYYY-MM-DD" for an <input type="date">.
export function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}
