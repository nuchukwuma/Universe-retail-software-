// Date helpers that use Lagos time (UTC+1, no daylight saving),
// so "today" means the shop's day even if the server is elsewhere.

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // Lagos is 1 hour ahead of UTC
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Returns today's date in Lagos as "YYYY-MM-DD".
function todayInLagos() {
  return new Date(Date.now() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

// Turns "YYYY-MM-DD" into the start and end of that day in Lagos time.
// Returns null if the text is not a valid date.
function lagosDayRange(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '')) return null;
  const [year, month, day] = dateText.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - LAGOS_OFFSET_MS);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + ONE_DAY_MS) };
}

// Builds a MongoDB filter for createdAt between two "YYYY-MM-DD" days
// (both days included). Either day can be left empty.
function createdAtFilter(fromText, toText) {
  const from = lagosDayRange(fromText);
  const to = lagosDayRange(toText);
  if (!from && !to) return null;

  const filter = {};
  if (from) filter.$gte = from.start;
  if (to) filter.$lt = to.end;
  return filter;
}

// Moves a "YYYY-MM-DD" date by a number of days, e.g. ('2026-10-27', -1) -> '2026-10-26'.
function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Counts the days from one "YYYY-MM-DD" to another, both included.
function daysBetween(fromText, toText) {
  const ms = new Date(`${toText}T00:00:00Z`) - new Date(`${fromText}T00:00:00Z`);
  return Math.round(ms / ONE_DAY_MS) + 1;
}

// Returns the Monday of the week a "YYYY-MM-DD" date is in (weeks run
// Monday to Sunday), e.g. '2026-10-29' (a Thursday) -> '2026-10-26'.
function mondayOf(dateText) {
  const weekday = new Date(`${dateText}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(dateText, -((weekday + 6) % 7));
}

module.exports = { todayInLagos, lagosDayRange, createdAtFilter, addDays, daysBetween, mondayOf };
