import { useEffect, useState } from 'react';
import { api } from '../api/api';
import PageHeader from '../components/PageHeader';
import { RATINGS } from '../components/checkout/FeedbackModal';
import { formatDateTime } from '../utils/dates';

const RATING_CLASS = { happy: 'status-ok', neutral: 'status-quiet', unhappy: 'status-bad' };

// What customers said at the till, newest first.
function FeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the feedback when the page opens.
  useEffect(() => {
    api.get('/feedback')
      .then(setFeedback)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <PageHeader title="Feedback" lead="What customers told the cashiers. Cashiers add it with the Feedback button at the till." />
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <dl className="figures">
        {RATINGS.map((r) => (
          <div key={r.value} className="figure">
            <dt>{r.label}</dt>
            <dd>{feedback.filter((f) => f.rating === r.value).length}</dd>
          </div>
        ))}
      </dl>

      <section className="panel panel-flush" aria-label="Feedback">
        {loading && <p className="loading">Loading feedback...</p>}
        {!loading && feedback.length === 0 && !error && <p className="empty muted">No feedback yet.</p>}
        {feedback.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Feeling</th>
                <th>What they said</th>
                <th>Customer</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((f) => (
                <tr key={f._id}>
                  <td><span className={`status ${RATING_CLASS[f.rating]}`}>{RATINGS.find((r) => r.value === f.rating)?.label}</span></td>
                  <td>{f.comment || <span className="muted">No comment</span>}</td>
                  <td>{f.customerName || <span className="muted">Not given</span>}</td>
                  <td>
                    {formatDateTime(f.createdAt)}
                    <span className="cell-sub">by {f.cashierName}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default FeedbackPage;
