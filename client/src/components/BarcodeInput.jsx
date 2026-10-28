// A text box for barcodes. A USB or Bluetooth scanner "types" the code
// and presses Enter: onEnter(code) runs. Pressing Enter here never
// submits the surrounding form by accident.
// (data-scan-input tells the page-wide scanner listener to leave it alone.)
function BarcodeInput({ value, onChange, onEnter, placeholder = 'Scan or type a barcode', autoFocus, inputRef, id }) {
  // Runs on every key press; we only care about Enter.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (onEnter && value.trim()) onEnter(value.trim());
    }
  }

  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete="off"
      spellCheck={false}
      data-scan-input
    />
  );
}

export default BarcodeInput;
