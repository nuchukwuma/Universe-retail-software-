// Sends a friendly error reply for a failed request.
// - Missing or invalid fields (validation errors) -> 400 with the reason
// - A duplicate unique value (e.g. same barcode)  -> 400
// - A badly formed id in the address              -> 400
// - Anything else                                 -> 500 with the fallback message
function handleError(res, error, fallbackMessage) {
  if (error.name === 'ValidationError') {
    const firstProblem = Object.values(error.errors)[0];
    return res.status(400).json({ message: firstProblem.message });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'value';
    return res.status(400).json({ message: `That ${field} is already used by another record.` });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${error.path}.` });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}

module.exports = handleError;
