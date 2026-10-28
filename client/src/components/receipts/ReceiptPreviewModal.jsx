import { useRef, useState } from 'react';
import Modal from '../Modal';
import { downloadReceiptPdf } from './receiptActions';

// Shows a receipt exactly as it will print, with Print and Save as PDF.
// "extraButtons" lets the caller add more (e.g. "Print later").
function ReceiptPreviewModal({ title, banner, receipt, paper, onPrint, pdfFileName, extraButtons, onClose }) {
  const receiptRef = useRef(null);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState('');

  // Saves the receipt on screen as a PDF file.
  async function handlePdf() {
    setMaking(true);
    setError('');
    try {
      await downloadReceiptPdf(receiptRef.current, pdfFileName, paper);
    } catch (err) {
      setError(`The PDF could not be made: ${err.message}`);
    } finally {
      setMaking(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn push-left" onClick={handlePdf} disabled={making}>
            {making ? 'Making the PDF...' : 'Save as PDF'}
          </button>
          {extraButtons}
          <button type="button" className="btn btn-primary btn-large" onClick={onPrint} autoFocus>
            Print receipt <span className="key">Enter</span>
          </button>
        </>
      }
    >
      {banner}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="receipt-preview">
        <div ref={receiptRef} className="receipt-preview-paper">
          {receipt}
        </div>
      </div>
    </Modal>
  );
}

export default ReceiptPreviewModal;
