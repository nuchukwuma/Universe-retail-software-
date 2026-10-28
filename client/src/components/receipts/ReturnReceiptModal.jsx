import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import ReturnReceipt from './ReturnReceipt';
import { useReceiptPrinting } from './useReceiptPrinting';

// Receipt preview for a return / refund, with Print and Save as PDF.
function ReturnReceiptModal({ ret: startingReturn, banner, onClose }) {
  const { settings } = useSettings();
  const { printReturn } = useReceiptPrinting();
  const [ret, setRet] = useState(startingReturn);

  // Prints the return slip and remembers that it was printed.
  async function handlePrint() {
    setRet(await printReturn(ret));
  }

  return (
    <ReceiptPreviewModal
      title={`Return ${ret.returnNumber}`}
      banner={banner}
      receipt={<ReturnReceipt ret={ret} settings={settings} duplicate={ret.printCount > 0} />}
      paper={settings.paperSize}
      onPrint={handlePrint}
      pdfFileName={`return-${ret.returnNumber}.pdf`}
      extraButtons={<button type="button" className="btn" onClick={onClose}>Done</button>}
      onClose={onClose}
    />
  );
}

export default ReturnReceiptModal;
