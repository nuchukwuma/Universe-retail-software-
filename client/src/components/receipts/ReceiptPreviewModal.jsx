import { useRef, useState } from 'react';
import Modal from '../Modal';
import { downloadReceiptPdf } from './receiptActions';
import { whatsAppLink } from '../../utils/phone';

// A pop-up that shows a receipt exactly as it will print, with buttons
// to Print, Download as PDF and Share via WhatsApp.
// "extraButtons" lets the caller add more (e.g. "Reprint later", "Skip").
function ReceiptPreviewModal({ title, banner, receipt, paper, onPrint, pdfFileName, whatsApp, extraButtons, onClose }) {
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
      setError(`Could not make the PDF: ${err.message}`);
    } finally {
      setMaking(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      {banner}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="receipt-preview">
        <div ref={receiptRef} className="receipt-preview-paper">
          {receipt}
        </div>
      </div>

      <div className="receipt-buttons">
        <button type="button" className="btn btn-primary" onClick={onPrint} autoFocus>
          🖨️ Print
        </button>
        <button type="button" className="btn" onClick={handlePdf} disabled={making}>
          {making ? 'Making PDF...' : '⬇️ Download PDF'}
        </button>
        {whatsApp && (
          <a className="btn btn-whatsapp" href={whatsAppLink(whatsApp.phone, whatsApp.text)} target="_blank" rel="noreferrer">
            💬 Share via WhatsApp
          </a>
        )}
        {extraButtons}
      </div>
    </Modal>
  );
}

export default ReceiptPreviewModal;
