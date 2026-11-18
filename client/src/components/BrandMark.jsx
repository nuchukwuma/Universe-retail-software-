// The HordeDesk mark: a blue tile with a counter and three stacked goods.
// Used where the shop has not added its own logo.
function BrandMark({ className, size = 36 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="HordeDesk">
      <rect width="48" height="48" rx="11" fill="#3346D3" />
      <rect x="10" y="12" width="9" height="9" rx="2" fill="#FFFFFF" />
      <rect x="21" y="12" width="9" height="9" rx="2" fill="#9AA8F5" />
      <rect x="15.5" y="23" width="9" height="9" rx="2" fill="#FFFFFF" opacity="0.85" />
      <rect x="8" y="34" width="32" height="4" rx="2" fill="#FFFFFF" />
      <rect x="32" y="16" width="4" height="18" rx="2" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
}

export default BrandMark;
