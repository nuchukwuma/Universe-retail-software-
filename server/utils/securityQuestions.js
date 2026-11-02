// Checks the owner's password-recovery questions before they are saved.
const QUESTION_COUNT = 3;

// Returns a message saying what is wrong, or null if the list is fine.
// "list" is [{ question, answer }, ...].
function securityQuestionsProblem(list) {
  if (!Array.isArray(list) || list.length !== QUESTION_COUNT) {
    return `Choose ${QUESTION_COUNT} security questions and answer each one.`;
  }
  const questions = list.map((item) => String(item?.question || '').trim());
  if (questions.some((q) => !q || q.length > 150)) return 'Choose a question for each of the three answers.';
  if (new Set(questions.map((q) => q.toLowerCase())).size !== QUESTION_COUNT) return 'Choose three different questions.';
  if (list.some((item) => String(item.answer || '').trim().length < 2)) return 'Answer every security question (at least 2 letters).';
  return null;
}

module.exports = { securityQuestionsProblem, QUESTION_COUNT };
