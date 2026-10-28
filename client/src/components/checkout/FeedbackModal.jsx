import { useId, useState } from 'react';
import { api } from '../../api/api';
import Modal from '../Modal';

export const RATINGS = [
  { value: 'happy', label: 'Happy' },
  { value: 'neutral', label: 'Okay' },
  { value: 'unhappy', label: 'Unhappy' },
];

// Records what a customer said about the shop.
// Managers read these on the Feedback page.
function FeedbackModal({ defaultCustomerName, onSaved, onClose }) {
  const formId = useId();
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
    <Modal
      title="Customer feedback"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form={formId} className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save feedback'}</button>
        </>
      }
    >
      <form id={formId} className="stack" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field-label" id={`${formId}-rating`}>How did the customer feel?</span>
          <div className="choices" role="group" aria-labelledby={`${formId}-rating`}>
            {RATINGS.map((r) => (
              <button key={r.value} type="button" className="choice" aria-pressed={rating === r.value} onClick={() => setRating(r.value)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-comment`}>What did they say?</label>
          <textarea id={`${formId}-comment`} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="e.g. Please stock more Ofada rice" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-name`}>Customer name (optional)</label>
          <input id={`${formId}-name`} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}

export default FeedbackModal;
