// The questions the owner can choose from for "Forgot your password?".
export const SECURITY_QUESTIONS = [
  "What is your mother's first name?",
  'What was the name of your first school?',
  'In which town or city were you born?',
  "What is your oldest sibling's first name?",
  'What was the name of your first pet?',
  'What is your favourite food?',
  'What was your first job?',
  'What is the name of the street you grew up on?',
];

// Three empty rows, ready for the form.
export function emptySecurityAnswers() {
  return [0, 1, 2].map(() => ({ question: '', answer: '' }));
}

// Returns what is wrong with the three rows, or '' if they are fine.
export function securityAnswersProblem(rows) {
  if (rows.some((row) => !row.question)) return 'Choose a question for each of the three security questions.';
  if (new Set(rows.map((row) => row.question)).size !== rows.length) return 'Choose three different security questions.';
  if (rows.some((row) => row.answer.trim().length < 2)) return 'Answer every security question (at least 2 letters).';
  return '';
}
