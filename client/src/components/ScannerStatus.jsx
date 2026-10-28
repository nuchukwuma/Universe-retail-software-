import { useWindowFocus } from '../hooks/useScanner';

// A small line of text saying whether a barcode scan will reach this page.
// "readyText" explains what a scan does on this page.
function ScannerStatus({ readyText = 'Scanner ready', paused = false, pausedText = 'Scanner paused' }) {
  const windowFocused = useWindowFocus();

  if (!windowFocused) {
    return <p className="scanner-status scanner-status-paused" role="status">Scanner paused: click anywhere in this window to scan again.</p>;
  }
  if (paused) {
    return <p className="scanner-status scanner-status-paused" role="status">{pausedText}</p>;
  }
  return <p className="scanner-status scanner-status-ready" role="status">{readyText}</p>;
}

export default ScannerStatus;
