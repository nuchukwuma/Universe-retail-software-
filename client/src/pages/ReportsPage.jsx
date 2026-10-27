import { useSearchParams } from 'react-router-dom';
import DateRangeFilter from '../components/reports/DateRangeFilter';
import DailySalesReport from '../components/reports/DailySalesReport';
import CashierReport from '../components/reports/CashierReport';
import BestSellersReport from '../components/reports/BestSellersReport';
import ProfitReport from '../components/reports/ProfitReport';
import StockLevelsReport from '../components/reports/StockLevelsReport';
import { shiftDate, todayDateValue } from '../utils/dates';

// The reports, one tab each.
const REPORTS = [
  { id: 'daily', label: '📅 Daily sales', Component: DailySalesReport },
  { id: 'cashiers', label: '🧑‍💼 By cashier', Component: CashierReport },
  { id: 'best-sellers', label: '🏆 Best sellers', Component: BestSellersReport },
  { id: 'profit', label: '💰 Profit', Component: ProfitReport },
  { id: 'stock', label: '📦 Stock levels', Component: StockLevelsReport },
];

// Reports page (managers and owners). The chosen report and dates are kept
// in the address, e.g. /reports?report=profit&from=2026-10-01&to=2026-10-27,
// so a report can be bookmarked or opened from the dashboard.
function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const today = todayDateValue();
  const reportId = params.get('report') || 'daily';
  const from = params.get('from') || shiftDate(today, -6);
  const to = params.get('to') || today;

  // Changes one or more of report / from / to in the address.
  function update(changes) {
    setParams({ report: reportId, from, to, ...changes }, { replace: true });
  }

  const current = REPORTS.find((r) => r.id === reportId) || REPORTS[0];
  const { Component } = current;

  return (
    <div>
      <h1 className="page-title">Reports</h1>

      <div className="report-tabs" role="tablist">
        {REPORTS.map((report) => (
          <button
            key={report.id}
            type="button"
            role="tab"
            aria-selected={report.id === current.id}
            className={report.id === current.id ? 'report-tab active' : 'report-tab'}
            onClick={() => update({ report: report.id })}
          >
            {report.label}
          </button>
        ))}
      </div>

      <DateRangeFilter from={from} to={to} onChange={(dates) => update(dates)} />
      <Component key={current.id} from={from} to={to} />
    </div>
  );
}

export default ReportsPage;
