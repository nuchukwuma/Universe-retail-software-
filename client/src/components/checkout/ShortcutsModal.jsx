import Modal from '../Modal';

// The keyboard shortcuts on the checkout screen (shown with F1).
export const SHORTCUT_LIST = [
  ['F1', 'Show this shortcut list'],
  ['F2', 'Search products'],
  ['F3', 'Choose or add customer'],
  ['F4', 'Scan with camera'],
  ['F9', 'Cancel (clear) the bill'],
  ['F10', 'Pay'],
  ['Enter', 'In the payment box: complete the sale'],
  ['Esc', 'Close any pop-up box'],
];

// Pop-up listing the keyboard shortcuts.
function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <table className="table">
        <tbody>
          {SHORTCUT_LIST.map(([key, action]) => (
            <tr key={key}>
              <td><kbd>{key}</kbd></td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">A USB barcode scanner works at any time - just scan.</p>
    </Modal>
  );
}

export default ShortcutsModal;
