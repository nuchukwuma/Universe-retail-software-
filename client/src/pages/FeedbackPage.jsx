import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { RATINGS } from '../components/checkout/FeedbackModal';
import { formatDateTime } from '../utils/dates';

// Back office page showing what customers said at the till.
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
    <div>
      <h1 className="page-title">Customer Feedback</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-cards">
        {RATINGS.map((r) => (
          <div key={r.value} className="stat-card">
            <span>{r.emoji} {r.label}</span>
            <strong>{feedback.filter((f) => f.rating === r.value).length}</strong>
          </div>
        ))}
      </div>

      <div className="card">
        {loading && <p className="muted">Loading...</p>}
        {!loading && feedback.length === 0 && <p className="muted">No feedback yet. Cashiers add it with the Feedback button.</p>}
        <ul className="history-list">
          {feedback.map((f) => (
            <li key={f._id}>
              <div className="history-list-top">
                <span>
                  <span className="feedback-emoji">{RATINGS.find((r) => r.value === f.rating)?.emoji}</span>
                  <strong>{f.customerName || 'A customer'}</strong>
                </span>
                <span className="muted small">{formatDateTime(f.createdAt)} · recorded by {f.cashierName}</span>
              </div>
              {f.comment && <p className="feedback-comment">{f.comment}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FeedbackPage;
