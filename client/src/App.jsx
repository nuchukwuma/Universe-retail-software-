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
import SuppliersPage from './pages/SuppliersPage';
import ReceiveStockPage from './pages/ReceiveStockPage';
import StockCountPage from './pages/StockCountPage';

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

      {/* Back office pages: managers and owners only */}
      <Route
        element={
          <ProtectedRoute roles={['owner', 'manager']}>
            <BackOfficeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/receive-stock" element={<ReceiveStockPage />} />
        <Route path="/stock-count" element={<StockCountPage />} />
        <Route
          path="/staff"
          element={
            <ProtectedRoute roles={['owner']}>
              <StaffPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Anything else goes to the checkout (or login if logged out) */}
      <Route path="*" element={<Navigate to="/checkout" replace />} />
    </Routes>
  );
}

export default App;
