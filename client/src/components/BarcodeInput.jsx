import { lazy, Suspense, useState } from 'react';

// The camera library is big, so it is only downloaded the first time
// someone presses the camera button. This keeps the app fast to open.
const CameraScanner = lazy(() => import('./CameraScanner'));

// A text box for barcodes with a camera button next to it.
// - A USB scanner "types" the code and presses Enter: onEnter(code) runs.
// - The 📷 button opens the camera: onChange(code) and onEnter(code) run.
// Pressing Enter here never submits the surrounding form by accident.
function BarcodeInput({ value, onChange, onEnter, placeholder = 'Scan or type barcode', autoFocus, inputRef, id }) {
  const [cameraOpen, setCameraOpen] = useState(false);

  // Runs on every key press; we only care about Enter.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (onEnter && value.trim()) onEnter(value.trim());
    }
  }

  // Runs when the camera reads a barcode.
  function handleCameraScan(code) {
    setCameraOpen(false);
    onChange(code);
    if (onEnter) onEnter(code);
  }

  return (
    <div className="barcode-input">
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
      />
      <button
        type="button"
        className="btn btn-icon"
        onClick={() => setCameraOpen(true)}
        title="Scan with camera"
        aria-label="Scan with camera"
      >
        📷
      </button>
      {cameraOpen && (
        <Suspense fallback={null}>
          <CameraScanner onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default BarcodeInput;
