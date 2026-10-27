import { useEffect, useState } from 'react';
import { billTotals, unitPriceFor } from '../utils/billMath';

// The current bill is saved in the browser, so a page refresh (or a
// quick trip to another page) does not lose it.
const BILL_KEY = 'pos_current_bill';

export const EMPTY_BILL = {
  priceType: 'standard', // 'standard' or 'wholesale'
  customer: null, // a saved customer { _id, name, phone }, or null
  customerName: '', // name typed for a walk-in customer
  // [{ productId, name, sellingPrice, wholesalePrice, unitPrice, quantity, discountType, discountValue }]
  items: [],
  discount: null, // discount on the whole bill: { type: 'percent' | 'amount', value }
  approval: null, // manager approval for a large discount: { token, approverName }
};

// Reads the bill saved in the browser (or starts an empty one).
function loadSavedBill() {
  try {
    return { ...EMPTY_BILL, ...JSON.parse(localStorage.getItem(BILL_KEY)) };
  } catch {
    return EMPTY_BILL;
  }
}

// Keeps track of the bill on the checkout screen and gives simple
// functions to change it. Every change happens in the browser only,
// so adding an item is instant.
export function useBill() {
  const [bill, setBill] = useState(loadSavedBill);

  // Save the bill every time it changes.
  useEffect(() => {
    localStorage.setItem(BILL_KEY, JSON.stringify(bill));
  }, [bill]);

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
        sellingPrice: product.sellingPrice,
        wholesalePrice: product.wholesalePrice || 0,
        unitPrice: unitPriceFor(product, current.priceType),
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

  // Switches between Standard and Wholesale prices for every line.
  function setPriceType(priceType) {
    setBill((current) => ({
      ...current,
      priceType,
      items: current.items.map((item) => ({ ...item, unitPrice: unitPriceFor(item, priceType) })),
    }));
  }

  // Links a saved customer to the bill (or null for none).
  function setCustomer(customer) {
    setBill((current) => ({ ...current, customer, customerName: customer ? customer.name : '' }));
  }

  // Sets a typed walk-in name. Typing un-links any saved customer.
  function setCustomerName(customerName) {
    setBill((current) => ({ ...current, customer: null, customerName }));
  }

  // Puts today's prices on every line, from a fresh product list.
  // (Prices may change while a bill is open or on hold.)
  function updatePrices(products) {
    const byId = Object.fromEntries(products.map((p) => [p._id, p]));
    setBill((current) => ({
      ...current,
      items: current.items.map((item) => {
        const product = byId[item.productId];
        if (!product) return item;
        return {
          ...item,
          name: product.name,
          sellingPrice: product.sellingPrice,
          wholesalePrice: product.wholesalePrice || 0,
          unitPrice: unitPriceFor(product, current.priceType),
        };
      }),
    }));
  }

  // Replaces the whole bill (used when a held bill is recalled).
  function loadBill(savedBill) {
    setBill({ ...EMPTY_BILL, ...savedBill });
  }

  // Empties the bill (after a sale, or when the cashier cancels).
  function clearBill() {
    setBill(EMPTY_BILL);
  }

  return {
    bill,
    totals: billTotals(bill.items, bill.discount),
    addProduct,
    setQuantity,
    changeQuantity,
    removeItem,
    setItemDiscount,
    setBillDiscount,
    setApproval,
    setPriceType,
    setCustomer,
    setCustomerName,
    updatePrices,
    loadBill,
    clearBill,
  };
}
