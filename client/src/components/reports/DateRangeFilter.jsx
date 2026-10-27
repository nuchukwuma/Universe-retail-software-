import { shiftDate, todayDateValue } from '../../utils/dates';

// Returns the quick date choices, worked out from today's date.
function quickRanges() {
  const today = todayDateValue();
  const thisMonthStart = `${today.slice(0, 8)}01`;
  const lastMonthEnd = shiftDate(thisMonthStart, -1);
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: 'Last 7 days', from: shiftDate(today, -6), to: today },
    { label: 'This month', from: thisMonthStart, to: today },
    { label: 'Last month', from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd },
    { label: 'This year', from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

// "From" and "To" date boxes plus quick buttons (Today, Last 7 days...).
// Calls onChange({ from, to }) when the dates change.
function DateRangeFilter({ from, to, onChange }) {
  return (
    <div className="card date-range">
      <label className="date-filter">
        From
        <input type="date" value={from} max={to} onChange={(e) => onChange({ from: e.target.value, to })} />
      </label>
      <label className="date-filter">
        To
        <input type="date" value={to} min={from} onChange={(e) => onChange({ from, to: e.target.value })} />
      </label>
      <div className="quick-ranges">
        {quickRanges().map((range) => (
          <button
            key={range.label}
            type="button"
            className={range.from === from && range.to === to ? 'btn btn-small active-range' : 'btn btn-small'}
            onClick={() => onChange({ from: range.from, to: range.to })}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DateRangeFilter;
