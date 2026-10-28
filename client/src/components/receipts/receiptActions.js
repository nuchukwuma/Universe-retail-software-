// Saves the receipt shown on screen as a PDF file.
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
