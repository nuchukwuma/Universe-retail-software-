import { SECURITY_QUESTIONS } from '../utils/securityQuestions';

// Three "question + answer" rows for the owner's password recovery.
// "rows" is [{ question, answer }, x3]; onChange(newRows) on every change.
// A question chosen in one row is not offered in the others.
function SecurityQuestionsFields({ idPrefix, rows, onChange }) {
  // Changes one field of one row.
  function setRow(index, field, value) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  return (
    <div className="security-questions">
      {rows.map((row, index) => {
        const takenElsewhere = rows.filter((_, i) => i !== index).map((r) => r.question);
        return (
          <div className="security-question" key={index}>
            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-q${index}`}>Security question {index + 1}</label>
              <select id={`${idPrefix}-q${index}`} value={row.question} onChange={(e) => setRow(index, 'question', e.target.value)} required>
                <option value="">Choose a question</option>
                {SECURITY_QUESTIONS.filter((q) => q === row.question || !takenElsewhere.includes(q)).map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor={`${idPrefix}-a${index}`}>Answer {index + 1}</label>
              <input id={`${idPrefix}-a${index}`} value={row.answer} onChange={(e) => setRow(index, 'answer', e.target.value)} autoComplete="off" required minLength={2} />
            </div>
          </div>
        );
      })}
      <p className="field-help">Capital letters and extra spaces do not matter ("Lagos" and "lagos" are the same). Keep the answers private.</p>
    </div>
  );
}

export default SecurityQuestionsFields;
