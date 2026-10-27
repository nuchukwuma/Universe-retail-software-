import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Modal from './Modal';

// The barcode types the camera should look for.
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
];

// Turns a camera error into a message a shop worker can act on.
function cameraErrorMessage(error) {
  const text = String(error?.message || error);
  if (text.includes('NotAllowed') || text.includes('Permission')) {
    return 'Camera permission was blocked. Allow camera access in your browser settings and try again.';
  }
  if (text.includes('NotFound') || text.includes('Requested device not found')) {
    return 'No camera was found on this device.';
  }
  return 'Could not start the camera. Close other apps using it and try again.';
}

// The same barcode is ignored if it is seen again within this time,
// so holding an item in front of the camera only counts it once.
const REPEAT_DELAY_MS = 2000;

// Opens the phone or laptop camera and reads barcodes.
// Calls onScan(code) for each barcode found.
// - Normal mode: stops after the first barcode.
// - "continuous" mode (checkout): keeps scanning until "Done" is pressed.
function CameraScanner({ onScan, onClose, continuous = false }) {
  const containerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState('');
  const [lastCode, setLastCode] = useState('');

  onScanRef.current = onScan;

  // Start the camera when the box opens and stop it when it closes.
  useEffect(() => {
    if (!window.isSecureContext) {
      setError(
        'The camera can only be used when the app is opened on this computer (localhost) or in the desktop app.'
      );
      return undefined;
    }

    // Each start gets its own box with a unique id, so starting twice
    // quickly (React does this in development) cannot clash.
    const box = document.createElement('div');
    box.id = `camera-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    containerRef.current.appendChild(box);

    const scanner = new Html5Qrcode(box.id, {
      formatsToSupport: FORMATS,
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    });

    let finished = false;
    let previous = { code: '', time: 0 };
    const started = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 150 } },
        (decodedText) => {
          const code = decodedText.trim();
          const now = Date.now();
          if (finished || (code === previous.code && now - previous.time < REPEAT_DELAY_MS)) return;

          previous = { code, time: now };
          if (!continuous) finished = true;
          setLastCode(code);
          onScanRef.current(code);
        },
        () => {} // called for every frame with no barcode - ignore
      )
      .catch((err) => {
        setError(cameraErrorMessage(err));
        throw err;
      });

    return () => {
      started
        .then(() => scanner.stop())
        .catch(() => {})
        .finally(() => box.remove());
    };
  }, [continuous]);

  return (
    <Modal title={continuous ? 'Scan items with camera' : 'Scan barcode with camera'} onClose={onClose}>
      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <p className="muted">Point the camera at the barcode and hold it steady.</p>
      )}
      <div ref={containerRef} className="camera-view" />
      {continuous && (
        <div className="form-actions">
          <span className="muted small camera-last">{lastCode ? `Last scanned: ${lastCode}` : 'Waiting for a barcode...'}</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      )}
    </Modal>
  );
}

export default CameraScanner;
