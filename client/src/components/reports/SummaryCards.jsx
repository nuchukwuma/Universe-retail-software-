import { formatNaira } from '../../utils/formatNaira';

// A row of big number cards above a report.
// "cards": [{ label, value, type: 'money' | 'number' | 'percent', note?, tone? }]
function SummaryCards({ cards }) {
  // Formats a card's number for its type.
  function show(card) {
    if (card.type === 'money') return formatNaira(card.value);
    if (card.type === 'percent') return `${card.value}%`;
    return Number(card.value || 0).toLocaleString('en-NG');
  }

  return (
    <div className="stat-cards">
      {cards.map((card) => (
        <div key={card.label} className={`stat-card ${card.tone ? `stat-card-${card.tone}` : ''}`}>
          <span>{card.label}</span>
          <strong>{show(card)}</strong>
          {card.note && <small>{card.note}</small>}
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
