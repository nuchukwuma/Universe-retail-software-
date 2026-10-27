import { useState } from 'react';
import { formatNaira } from '../../utils/formatNaira';
import { formatDate } from '../../utils/dates';
import { exportToExcel } from '../../utils/exportExcel';

// Shows one value on screen in the right format for its column type.
function displayValue(column, row) {
  if (column.render) return column.render(row);
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return <span className="muted">—</span>;

  switch (column.type) {
    case 'money':
      return formatNaira(value);
    case 'number':
      return Number(value).toLocaleString('en-NG');
    case 'percent':
      return `${value}%`;
    case 'date':
      return formatDate(value);
    default:
      return value;
  }
}

const RIGHT_ALIGNED = ['money', 'number', 'percent'];

// A report table with an optional TOTAL line and an "Export to Excel" button.
// "columns": [{ key, header, type, width?, render?, excelValue? }]
function ReportTable({ title, subtitle, fileName, columns, rows, totals, emptyText = 'No data for these dates.' }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Saves the table as an Excel file.
  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await exportToExcel({ fileName, title, subtitle, columns, rows, totals });
    } catch (err) {
      setError(`Could not create the Excel file: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card">
      <div className="page-header">
        <h2>{title}</h2>
        <button type="button" className="btn btn-excel" onClick={handleExport} disabled={exporting || rows.length === 0}>
          {exporting ? 'Exporting...' : '📗 Export to Excel'}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={RIGHT_ALIGNED.includes(column.type) ? 'number' : ''}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row._key || index}>
                {columns.map((column) => (
                  <td key={column.key} className={RIGHT_ALIGNED.includes(column.type) ? 'number' : ''}>
                    {displayValue(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot>
              <tr>
                {columns.map((column, index) => (
                  <td key={column.key} className={RIGHT_ALIGNED.includes(column.type) ? 'number' : ''}>
                    {index === 0 ? 'TOTAL' : totals[column.key] !== undefined ? displayValue(column, totals) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {rows.length === 0 && <p className="muted">{emptyText}</p>}
    </div>
  );
}

export default ReportTable;
