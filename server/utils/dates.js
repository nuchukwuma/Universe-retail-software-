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

module.exports = { todayInLagos, lagosDayRange, createdAtFilter };
