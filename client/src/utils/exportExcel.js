// Saves a report table as a real Excel (.xlsx) file.
//
// "columns" describe each column, the same ones the report table uses:
//   { key: 'netSales', header: 'Net sales', type: 'money', width: 14 }
// type can be 'money', 'number', 'percent', 'date' or 'text'.

// Turns one value into an Excel cell with the right number format.
function toCell(column, value) {
  if (value === null || value === undefined || value === '') return null;

  switch (column.type) {
    case 'money':
      return { value: Number(value), type: Number, format: '"₦"#,##0.00' };
    case 'number':
      return { value: Number(value), type: Number, format: '#,##0' };
    case 'percent':
      return { value: Number(value) / 100, type: Number, format: '0.0%' };
    case 'date':
      return { value: new Date(value), type: Date, format: 'dd mmm yyyy' };
    default:
      return { value: String(value), type: String };
  }
}

// Builds the spreadsheet (title, date range, header, rows, total) and
// downloads it. The Excel library loads only when first needed.
export async function exportToExcel({ fileName, title, subtitle, columns, rows, totals }) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const span = columns.length;
  const emptyCells = Array(span - 1).fill(null);

  const sheet = [
    [{ value: title, fontWeight: 'bold', fontSize: 14, columnSpan: span }, ...emptyCells],
    [{ value: subtitle, textColor: '#555555', columnSpan: span }, ...emptyCells],
    [null],
    columns.map((column) => ({ value: column.header, fontWeight: 'bold', backgroundColor: '#E1F0EE' })),
    ...rows.map((row) => columns.map((column) => toCell(column, column.excelValue ? column.excelValue(row) : row[column.key]))),
  ];

  // The "TOTAL" line at the bottom (only for columns that have a total).
  if (totals) {
    sheet.push(
      columns.map((column, index) => {
        if (index === 0) return { value: 'TOTAL', fontWeight: 'bold' };
        const cell = toCell(column, totals[column.key]);
        return cell ? { ...cell, fontWeight: 'bold' } : null;
      })
    );
  }

  await writeExcelFile(sheet, {
    sheet: 'Report',
    columns: columns.map((column) => ({ width: column.width || 14 })),
    stickyRowsCount: 4, // keep the header row visible when scrolling
  }).toFile(fileName);
}
