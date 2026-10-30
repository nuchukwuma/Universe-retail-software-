import Modal from '../Modal';

// The keyboard shortcuts on the sales screen (shown with F1).
export const SHORTCUT_LIST = [
  ['F1', 'Show this list'],
  ['F2', 'Find a product by name'],
  ['F6', 'Hold the bill'],
  ['F7', 'Recall a held bill'],
  ['F8', 'Discount'],
  ['F9', 'Cancel the bill'],
  ['F10', 'Complete the sale'],
  ['Enter', 'In the barcode box: add the product. In a window: confirm.'],
  ['Esc', 'Close a window, or go back to the barcode box'],
];

// Lists the keyboard shortcuts.
function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <table className="table">
        <thead>
          <tr>
            <th>Key</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUT_LIST.map(([key, action]) => (
            <tr key={key}>
              <td className="strong">{key}</td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">The barcode scanner works at any time on this screen. There is no need to click first.</p>
    </Modal>
  );
}

export default ShortcutsModal;
