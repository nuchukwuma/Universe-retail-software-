// Formats a number as Naira, e.g. 12500 -> "₦12,500".
// Kobo (decimals) are only shown when the amount is not a whole number.
export function formatNaira(amount) {
  const value = Number(amount) || 0;
  const hasKobo = value % 1 !== 0;

  return '₦' + value.toLocaleString('en-NG', {
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
