import { useNavigate } from 'react-router-dom';
import Modal from '../Modal';
import { useAuth } from '../../context/AuthContext';
import { canUseBackOffice } from '../../utils/roles';

// Shown when a scanned barcode does not match any product.
// Managers and owners can jump straight to adding it as a new product.
function BarcodeNotFoundModal({ code, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Modal title="Product not found" onClose={onClose}>
      <p>
        No product has the barcode <strong>{code}</strong>.
      </p>
      <p className="muted">
        Check the item was scanned properly and try again.
        {!canUseBackOffice(user) && ' If it is a new product, ask a manager to add it.'}
      </p>
      <div className="form-actions">
        {canUseBackOffice(user) && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/products/new?barcode=${encodeURIComponent(code)}&from=checkout`)}
          >
            + Add as New Product
          </button>
        )}
        <button type="button" className="btn" onClick={onClose} autoFocus>
          OK
        </button>
      </div>
    </Modal>
  );
}

export default BarcodeNotFoundModal;
