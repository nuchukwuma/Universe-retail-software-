import { useState } from 'react';

// A small form with name and phone boxes for adding or editing a customer.
// Calls onSave({ name, phone }) - the parent does the saving.
function CustomerForm({ initial = { name: '', phone: '' }, saving, submitLabel = 'Save Customer', onSave, onCancel }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone || '');

  // Runs when the form is submitted.
  function handleSubmit(event) {
    event.preventDefault();
    onSave({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <label>
        Name *
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <label>
        Phone number
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}

export default CustomerForm;
