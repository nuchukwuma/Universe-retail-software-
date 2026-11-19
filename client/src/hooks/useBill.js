import { useEffect, useState } from 'react';
import { billTotals } from '../utils/billMath';

// The open bills are saved in the browser, so a page refresh (or a quick
// trip to another page) does not lose them.
const BILLS_KEY = 'pos_open_bills';
const OLD_BILL_KEY = 'pos_current_bill'; // one bill, before version 2
const MAX_BILLS = 12;

export const EMPTY_BILL = {
  // [{ productId, name, barcode, unitPrice, quantity, discountType, discountValue }]
  items: [],
  discount: null, // discount on the whole bill: { type: 'percent' | 'amount', value }
  approval: null, // manager approval for a large discount: { token, approverName }
  label: '', // a name for the tab (e.g. the customer's), if any
  customer: null, // loyalty customer: { _id, name, phone, points }
  pointsToUse: 0, // loyalty points the customer spends on this bill
};

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function freshBill() {
  return { ...EMPTY_BILL, id: newId() };
}

// Only the fields a bill uses today are kept (older versions saved more).
function cleanBill(saved = {}) {
  return {
    id: typeof saved.id === 'string' ? saved.id : newId(),
    items: Array.isArray(saved.items) ? saved.items : [],
    discount: saved.discount || null,
    approval: saved.approval || null,
    label: typeof saved.label === 'string' ? saved.label : '',
    customer: saved.customer && saved.customer._id ? saved.customer : null,
    pointsToUse: Number(saved.pointsToUse) > 0 ? Math.floor(Number(saved.pointsToUse)) : 0,
  };
}

// Reads the open bills saved in the browser (or starts with one empty bill).
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(BILLS_KEY));
    if (saved && Array.isArray(saved.bills) && saved.bills.length) {
      const bills = saved.bills.map(cleanBill);
      const active = Math.min(Math.max(Number(saved.active) || 0, 0), bills.length - 1);
      return { bills, active };
    }
    const old = JSON.parse(localStorage.getItem(OLD_BILL_KEY));
    if (old) return { bills: [cleanBill(old)], active: 0 };
  } catch {
    // start afresh
  }
  return { bills: [freshBill()], active: 0 };
}

// Keeps track of the open bills on the till (one per tab) and gives simple
// functions to change the one being served. Every change happens in the
// browser only, so adding an item is instant.
export function useBill() {
  const [state, setState] = useState(loadSaved);
  const bill = state.bills[state.active];

  // Save the bills every time they change.
  useEffect(() => {
    try {
      localStorage.setItem(BILLS_KEY, JSON.stringify(state));
      localStorage.removeItem(OLD_BILL_KEY);
    } catch {
      // kept for this visit only
    }
  }, [state]);

  // Changes the bill being served: "change" gets it and answers the new one.
  function setBill(change) {
    setState((current) => ({
      ...current,
      bills: current.bills.map((b, i) => (i === current.active ? change(b) : b)),
    }));
  }

  // Changes one line of the bill. "changes" are the fields to update.
  function updateItem(productId, changes) {
    setBill((current) => ({
      ...current,
      items: current.items.map((item) => (item.productId === productId ? { ...item, ...changes } : item)),
    }));
  }

  // Adds one of a product. If it is already on the bill, adds 1 to its quantity.
  function addProduct(product) {
    setBill((current) => {
      const existing = current.items.find((item) => item.productId === product._id);
      if (existing) {
        return {
          ...current,
          items: current.items.map((item) =>
            item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }

      const newItem = {
        productId: product._id,
        name: product.name,
        barcode: product.barcode || '',
        unitPrice: product.sellingPrice,
        quantity: 1,
        discountType: '',
        discountValue: 0,
      };
      return { ...current, items: [...current.items, newItem] };
    });
  }

  // Sets the quantity of one line (never below 1 - use removeItem instead).
  function setQuantity(productId, quantity) {
    updateItem(productId, { quantity: Math.max(1, Math.floor(Number(quantity)) || 1) });
  }

  // Adds (or with a negative number, takes away) from one line's quantity.
  function changeQuantity(productId, amount) {
    const item = bill.items.find((i) => i.productId === productId);
    if (item) setQuantity(productId, item.quantity + amount);
  }

  // Takes a line off the bill.
  function removeItem(productId) {
    setBill((current) => ({ ...current, items: current.items.filter((item) => item.productId !== productId) }));
  }

  // Sets a discount on one line. type '' removes it.
  function setItemDiscount(productId, type, value) {
    updateItem(productId, { discountType: type, discountValue: type ? Number(value) || 0 : 0 });
  }

  // Sets a discount on the whole bill ({ type, value }), or null to remove it.
  function setBillDiscount(discount) {
    setBill((current) => ({ ...current, discount }));
  }

  // Remembers a manager's approval for a large discount ({ token, approverName }).
  function setApproval(approval) {
    setBill((current) => ({ ...current, approval }));
  }

  // The loyalty customer for this bill (or null), and the points to spend.
  function setCustomer(customer) {
    setBill((current) => ({ ...current, customer, pointsToUse: 0 }));
  }

  function setPointsToUse(points) {
    setBill((current) => ({ ...current, pointsToUse: Math.max(0, Math.floor(Number(points)) || 0) }));
  }

  // Puts today's prices on every line of every open bill, from a fresh
  // product list. (Prices may change while a bill is open.)
  function updatePrices(products) {
    const byId = Object.fromEntries(products.map((p) => [p._id, p]));
    const reprice = (b) => ({
      ...b,
      items: b.items.map((item) => {
        const product = byId[item.productId];
        if (!product) return item;
        return { ...item, name: product.name, barcode: product.barcode || '', unitPrice: product.sellingPrice };
      }),
    });
    setState((current) => ({ ...current, bills: current.bills.map(reprice) }));
  }

  // ----- Tabs: more than one bill open at once -----

  // Opens a new, empty bill and serves it. Answers false when too many are open.
  function newBill(fromSaved) {
    if (state.bills.length >= MAX_BILLS) return false;
    setState((current) => ({
      bills: [...current.bills, fromSaved ? cleanBill({ ...fromSaved, id: undefined }) : freshBill()],
      active: current.bills.length,
    }));
    return true;
  }

  // Serves another open bill.
  function switchBill(index) {
    setState((current) => ({ ...current, active: Math.min(Math.max(index, 0), current.bills.length - 1) }));
  }

  // Closes a bill (after a sale, or when it is cancelled). The last bill
  // left is emptied instead, so there is always one to serve.
  function closeBill(index = state.active) {
    setState((current) => {
      if (current.bills.length === 1) return { bills: [freshBill()], active: 0 };
      const bills = current.bills.filter((_, i) => i !== index);
      let active = current.active;
      if (index < active || active >= bills.length) active -= 1;
      return { bills, active: Math.max(0, Math.min(active, bills.length - 1)) };
    });
  }

  // Empties the bill being served (after a sale, or when it is cancelled):
  // its tab closes if other bills are open.
  function clearBill() {
    closeBill(state.active);
  }

  // Names a bill's tab.
  function renameBill(index, label) {
    setState((current) => ({
      ...current,
      bills: current.bills.map((b, i) => (i === index ? { ...b, label } : b)),
    }));
  }

  return {
    bill,
    bills: state.bills,
    activeIndex: state.active,
    totals: billTotals(bill.items, bill.discount),
    addProduct,
    setQuantity,
    changeQuantity,
    removeItem,
    setItemDiscount,
    setBillDiscount,
    setApproval,
    setCustomer,
    setPointsToUse,
    updatePrices,
    newBill,
    switchBill,
    closeBill,
    clearBill,
    renameBill,
    maxBills: MAX_BILLS,
  };
}
