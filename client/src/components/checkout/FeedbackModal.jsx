import { useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';

export const RATINGS = [
  { value: 'happy', emoji: '😀', label: 'Happy' },
  { value: 'neutral', emoji: '😐', label: 'Okay' },
  { value: 'unhappy', emoji: '🙁', label: 'Unhappy' },
];

// Pop-up for recording what a customer said about the shop.
// Managers read these on the Feedback page.
function FeedbackModal({ defaultCustomerName, onSaved, onClose }) {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState(defaultCustomerName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sends the feedback to the server.
  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) {
      setError('Choose how the customer felt.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/feedback', { rating, comment, customerName });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Customer feedback" onClose={onClose}>
      <form className="customer-form" onSubmit={handleSubmit}>
        <div className="rating-buttons">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={rating === r.value ? 'rating-button active' : 'rating-button'}
              onClick={() => setRating(r.value)}
            >
              <span>{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </div>
        <label>
          What did the customer say?
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="e.g. Please stock more Ofada rice" />
        </label>
        <label>
          Customer name (optional)
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Feedback'}</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default FeedbackModal;
