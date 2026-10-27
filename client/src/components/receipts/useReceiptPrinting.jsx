import { api } from '../../api/api';
import { usePrinter } from '../../context/PrintContext';
import { useSettings } from '../../context/SettingsContext';
import SaleReceipt from './SaleReceipt';
import ReturnReceipt from './ReturnReceipt';

// Prints sale and return receipts and tells the server about each print.
// The first print is the original; every later print says DUPLICATE COPY.
export function useReceiptPrinting() {
  const { printDocument } = usePrinter();
  const { settings } = useSettings();

  // Prints a sale receipt. Returns the sale with its new print count.
  async function printSale(sale) {
    printDocument(<SaleReceipt sale={sale} settings={settings} duplicate={sale.printCount > 0} />, settings.paperSize);
    try {
      const data = await api.post(`/sales/${sale._id}/printed`);
      return { ...sale, printCount: data.printCount };
    } catch {
      return { ...sale, printCount: (sale.printCount || 0) + 1 };
    }
  }

  // Prints a return receipt. Returns the return with its new print count.
  async function printReturn(ret) {
    printDocument(<ReturnReceipt ret={ret} settings={settings} duplicate={ret.printCount > 0} />, settings.paperSize);
    try {
      const data = await api.post(`/returns/${ret._id}/printed`);
      return { ...ret, printCount: data.printCount };
    } catch {
      return { ...ret, printCount: (ret.printCount || 0) + 1 };
    }
  }

  return { printSale, printReturn };
}
