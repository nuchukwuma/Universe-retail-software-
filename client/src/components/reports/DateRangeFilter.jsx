import { shiftDate, todayDateValue } from '../../utils/dates';
import DateInput from '../DateInput';

// Returns the quick date choices, worked out from today's date.
function quickRanges() {
  const today = todayDateValue();
  const thisMonthStart = `${today.slice(0, 8)}01`;
  const lastMonthEnd = shiftDate(thisMonthStart, -1);
  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: 'Last 7 days', from: shiftDate(today, -6), to: today },
    { label: 'Last 4 weeks', from: shiftDate(today, -27), to: today },
    { label: 'This month', from: thisMonthStart, to: today },
    { label: 'Last month', from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd },
    { label: 'This year', from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

// "From" and "To" dates plus quick choices (Today, Last 7 days...).
// Calls onChange({ from, to }) when the dates change.
function DateRangeFilter({ from, to, onChange }) {
  return (
    <div className="panel toolbar">
      <div className="field">
        <label className="field-label" htmlFor="report-from">From</label>
        <DateInput id="report-from" value={from} max={to} onChange={(e) => onChange({ from: e.target.value, to })} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="report-to">To</label>
        <DateInput id="report-to" value={to} min={from} onChange={(e) => onChange({ from, to: e.target.value })} />
      </div>
      <div className="choices" role="group" aria-label="Quick dates">
        {quickRanges().map((range) => (
          <button
            key={range.label}
            type="button"
            className="choice"
            aria-pressed={range.from === from && range.to === to}
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
