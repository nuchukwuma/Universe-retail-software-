// True in the website's browser demo ("npm run build:demo").
export const IS_DEMO = import.meta.env.VITE_DEMO === '1';

// The Windows installer: always the newest release on GitHub.
export const DOWNLOAD_URL = 'https://github.com/nuchukwuma/Universe-retail-software-/releases/latest/download/HordeDesk-Setup.exe';

// Default store details, used until the real settings load from the
// server. The owner changes the real ones on the Settings page.
export const DEFAULT_SETTINGS = {
  storeName: 'My Shop',
  address: '',
  phone: '',
  footerMessage: 'Thank you for shopping with us!',
  paperSize: '80mm',
  autoPrint: false,
  receiptLogo: true,
  printerName: '',
  maxCashierDiscountPercent: 10,
  loyaltyEnabled: false,
  loyaltyEarnEvery: 100,
  loyaltyPointValue: 1,
  telegramAlertsEnabled: true,
};
