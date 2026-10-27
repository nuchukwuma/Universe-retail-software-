import { formatNaira } from '../../utils/formatNaira';
import { formatDateTime } from '../../utils/dates';
import { PAYMENT_LABELS } from '../../utils/billMath';

// Saves the receipt shown on screen as a PDF file the customer can keep.
// The two PDF libraries are big, so they load only when first needed.
export async function downloadReceiptPdf(element, fileName, paper) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);

  // 1. Take a sharp "photo" of the receipt.
  const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff' });

  // 2. Put the photo on a page the same width as the receipt paper.
  const pageWidth = paper === 'A4' ? 210 : paper === '58mm' ? 58 : 80;
  const imageWidth = paper === 'A4' ? 150 : pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const pageHeight = paper === 'A4' ? 297 : imageHeight;

  const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, Math.max(pageHeight, imageHeight)] });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - imageWidth) / 2, 0, imageWidth, imageHeight);
  pdf.save(fileName);
}

// Writes a sale as plain text, for sending on WhatsApp.
export function saleAsText(sale, settings) {
  const lines = [
    `*${settings.storeName}*`,
    `Receipt: ${sale.receiptNumber}`,
    formatDateTime(sale.createdAt),
    '',
    ...sale.items.map((item) => `${item.name}\n  ${item.quantity} x ${formatNaira(item.unitPrice)} = ${formatNaira(item.lineTotal)}`),
    '',
  ];
  if (sale.discountTotal > 0) lines.push(`Discount: -${formatNaira(sale.discountTotal)}`);
  lines.push(`*TOTAL: ${formatNaira(sale.total)}*`);
  lines.push(`Paid (${PAYMENT_LABELS[sale.paymentMethod]}): ${formatNaira(sale.amountTendered)}`);
  if (sale.change > 0) lines.push(`Change: ${formatNaira(sale.change)}`);
  if (settings.footerMessage) lines.push('', settings.footerMessage);
  return lines.join('\n');
}

// Writes a return as plain text, for sending on WhatsApp.
export function returnAsText(ret, settings) {
  return [
    `*${settings.storeName}* - RETURN / REFUND`,
    `Return: ${ret.returnNumber} (receipt ${ret.receiptNumber})`,
    formatDateTime(ret.createdAt),
    '',
    ...ret.items.map((item) => `${item.name} x ${item.quantity} = ${formatNaira(item.refundAmount)}`),
    '',
    `*REFUND: ${formatNaira(ret.refundTotal)}* (${PAYMENT_LABELS[ret.refundMethod]})`,
  ].join('\n');
}
