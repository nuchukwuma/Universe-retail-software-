import { useState } from 'react';
import { formatNaira } from '../../utils/formatNaira';
import { formatDate } from '../../utils/dates';
import { exportToExcel } from '../../utils/exportExcel';

// Shows one value on screen in the right format for its column type.
function displayValue(column, row) {
  if (column.render) return column.render(row);
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return <span className="muted">None</span>;
  switch (column.type) {
    case 'money':
      return formatNaira(value);
    case 'number':
      return Number(value).toLocaleString('en-NG');
    case 'date':
      return formatDate(value);
    default:
      return value;
  }
}

const RIGHT_ALIGNED = ['money', 'number'];

// A report table with an optional Total line and an "Export to Excel" button.
// "columns": [{ key, header, type, width?, render?, excelValue? }]
function ReportTable({ title, subtitle, fileName, columns, rows, totals, emptyText = 'No sales on these dates.' }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Saves the table as an Excel file.
  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await exportToExcel({ fileName, title, subtitle, columns, rows, totals });
    } catch (err) {
      setError(`The Excel file could not be made: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="panel panel-flush" aria-label={title}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p className="small">{subtitle}</p>
        </div>
        <button type="button" className="btn" onClick={handleExport} disabled={exporting || rows.length === 0}>
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      {rows.length === 0 ? (
        <p className="empty muted">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={RIGHT_ALIGNED.includes(column.type) ? 'num' : undefined}>{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row._key || index}>
                  {columns.map((column) => (
                    <td key={column.key} className={RIGHT_ALIGNED.includes(column.type) ? 'num' : undefined}>
                      {displayValue(column, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr>
                  {columns.map((column, index) => (
                    <td key={column.key} className={RIGHT_ALIGNED.includes(column.type) ? 'num' : undefined}>
                      {index === 0 ? 'Total' : totals[column.key] !== undefined ? displayValue(column, totals) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}

export default ReportTable;
