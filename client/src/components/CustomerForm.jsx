import { useId, useState } from 'react';

// Name and phone boxes for adding or editing a customer.
// Calls onSave({ name, phone }); the parent does the saving.
// Give "formId" to put the submit button in a dialog footer instead.
function CustomerForm({ initial = { name: '', phone: '' }, saving, submitLabel = 'Save customer', onSave, onCancel, formId }) {
  const ownId = useId();
  const id = formId || ownId;
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone || '');

  // Runs when the form is submitted.
  function handleSubmit(event) {
    event.preventDefault();
    onSave({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <form id={id} className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-phone`}>Phone number (optional)</label>
        <input id={`${id}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" />
      </div>
      {!formId && (
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</button>
          {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
        </div>
      )}
    </form>
  );
}

export default CustomerForm;
