import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import SaleReceipt from './SaleReceipt';
import { useReceiptPrinting } from './useReceiptPrinting';

// Receipt preview for a sale (after checkout, or from Sales History).
// "banner" shows above the receipt (e.g. the change to give).
// "extraButtons" are added next to Print (e.g. Reprint later / Skip).
function SaleReceiptModal({ sale: startingSale, banner, extraButtons, onClose, onPrinted }) {
  const { settings } = useSettings();
  const { printSale } = useReceiptPrinting();
  const [sale, setSale] = useState(startingSale);

  // Prints the receipt and remembers that it was printed.
  async function handlePrint() {
    const updated = await printSale(sale);
    setSale(updated);
    if (onPrinted) onPrinted(updated);
  }

  return (
    <ReceiptPreviewModal
      title={`Receipt ${sale.receiptNumber}`}
      banner={banner}
      receipt={<SaleReceipt sale={sale} settings={settings} duplicate={sale.printCount > 0} />}
      paper={settings.paperSize}
      onPrint={handlePrint}
      pdfFileName={`receipt-${sale.receiptNumber}.pdf`}
      extraButtons={extraButtons}
      onClose={onClose}
    />
  );
}

export default SaleReceiptModal;
