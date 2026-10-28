import { formatNaira } from '../../utils/formatNaira';

// A row of plain headline numbers above a report.
// "figures": [{ label, value, type: 'money' | 'number', note? }]
function ReportFigures({ figures }) {
  return (
    <dl className="figures">
      {figures.map((figure) => (
        <div key={figure.label} className="figure">
          <dt>{figure.label}</dt>
          <dd>
            {figure.type === 'money' ? formatNaira(figure.value) : Number(figure.value).toLocaleString('en-NG')}
            {figure.note && <span className="figure-note muted">{figure.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default ReportFigures;
