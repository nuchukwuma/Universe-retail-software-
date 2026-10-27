import { useEffect, useState } from 'react';
import { billTotals, unitPriceFor } from '../utils/billMath';

// The current bill is saved in the browser, so a page refresh (or a
// quick trip to another page) does not lose it.
const BILL_KEY = 'pos_current_bill';

const EMPTY_BILL = {
  priceType: 'standard', // 'standard' or 'wholesale'
  customer: null, // a saved customer { _id, name, phone }, or null
  customerName: '', // name typed for a walk-in customer
  items: [], // [{ productId, name, sellingPrice, wholesalePrice, unitPrice, quantity }]
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
      };
      return { ...current, items: [...current.items, newItem] };
    });
  }

  // Sets the quantity of one line (never below 1 - use removeItem instead).
  function setQuantity(productId, quantity) {
    const safeQuantity = Math.max(1, Math.floor(Number(quantity)) || 1);
    setBill((current) => ({
      ...current,
      items: current.items.map((item) => (item.productId === productId ? { ...item, quantity: safeQuantity } : item)),
    }));
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

  // Empties the bill (after a sale, or when the cashier cancels).
  function clearBill() {
    setBill(EMPTY_BILL);
  }

  return {
    bill,
    totals: billTotals(bill.items),
    addProduct,
    setQuantity,
    changeQuantity,
    removeItem,
    setPriceType,
    setCustomer,
    setCustomerName,
    clearBill,
  };
}
