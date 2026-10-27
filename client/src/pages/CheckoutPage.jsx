import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { formatNaira } from '../utils/formatNaira';

// The checkout screen - the first page a cashier sees after login.
// Stage 1 only shows the top bar; the bill, product grid, categories
// and payment buttons are built in Stage 3.
function CheckoutPage() {
  const { user } = useAuth();

  return (
    <div className="checkout-page">
      <TopBar showBackOfficeLink />
      <main className="placeholder-panel">
        <h2>Welcome, {user.name}!</h2>
        <p>The full checkout screen will be built in Stage 3.</p>
        <p className="muted">Naira format check: {formatNaira(12500)} · {formatNaira(1250000.5)}</p>
      </main>
    </div>
  );
}

export default CheckoutPage;
