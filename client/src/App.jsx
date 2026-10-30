import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import BackOfficeLayout from './components/BackOfficeLayout';
import LoginPage from './pages/LoginPage';
import CheckoutPage from './pages/CheckoutPage';
import DashboardPage from './pages/DashboardPage';
import StaffPage from './pages/StaffPage';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import CategoriesPage from './pages/CategoriesPage';
import AddStockPage from './pages/AddStockPage';
import StockCountPage from './pages/StockCountPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import EndOfDayPage from './pages/EndOfDayPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import BackupPage from './pages/BackupPage';

const MANAGERS = ['owner', 'manager'];

// Wraps a page so only managers and owners can open it.
function managersOnly(page) {
  return <ProtectedRoute roles={MANAGERS}>{page}</ProtectedRoute>;
}

// Wraps a page so only the owner can open it.
function ownerOnly(page) {
  return <ProtectedRoute roles={['owner']}>{page}</ProtectedRoute>;
}

// Lists every page (route) in the app and who is allowed to see it.
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Everyone who is logged in can use the checkout */}
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />

      {/* Pages with the side menu. Each page says who may open it. */}
      <Route
        element={
          <ProtectedRoute>
            <BackOfficeLayout />
          </ProtectedRoute>
        }
      >
        {/* Everyone (cashiers too) */}
        <Route path="/sales-history" element={<SalesHistoryPage />} />
        <Route path="/end-of-day" element={<EndOfDayPage />} />

        {/* Managers and owners */}
        <Route path="/dashboard" element={managersOnly(<DashboardPage />)} />
        <Route path="/reports" element={managersOnly(<ReportsPage />)} />
        <Route path="/products" element={managersOnly(<ProductsPage />)} />
        <Route path="/products/new" element={managersOnly(<ProductFormPage />)} />
        <Route path="/products/:id/edit" element={managersOnly(<ProductFormPage />)} />
        <Route path="/categories" element={managersOnly(<CategoriesPage />)} />
        <Route path="/add-stock" element={managersOnly(<AddStockPage />)} />
        <Route path="/receive-stock" element={<Navigate to="/add-stock" replace />} />
        <Route path="/stock-count" element={managersOnly(<StockCountPage />)} />

        {/* Owner only */}
        <Route path="/staff" element={ownerOnly(<StaffPage />)} />
        <Route path="/settings" element={ownerOnly(<SettingsPage />)} />
        <Route path="/backup" element={ownerOnly(<BackupPage />)} />
      </Route>

      {/* Anything else goes to the checkout (or login if logged out) */}
      <Route path="*" element={<Navigate to="/checkout" replace />} />
    </Routes>
  );
}

export default App;
