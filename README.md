# Universe Retail POS

A web-based point-of-sale and retail management system for a Nigerian supermarket / beauty store.

- **Frontend:** React (built with Vite), in `/client`
- **Backend:** Node.js + Express, in `/server`
- **Database:** MongoDB (models in `/server/models`, API routes in `/server/routes`)

## Build progress

| Stage | What it adds | Status |
|------:|--------------|--------|
| 1 | Project setup, login and roles | ✅ Done |
| 2 | Products, categories and inventory | ✅ Done |
| 3 | Checkout screen, barcode scanning and payments | ✅ Done |
| 4 | Receipts and printing, hold/recall, returns, discounts | ⏳ Next |
| 5 | Telegram sales alerts | |
| 6 | Reports and Excel export | |
| 7 | Public website | |

---

## How to run it (step by step)

### 1. Install the tools (one time only)

1. **Node.js 18 or newer:** download the "LTS" version from <https://nodejs.org>.
   Check it worked by opening a terminal and typing `node -v`.
2. **MongoDB:** choose one:
   - **On your computer:** install *MongoDB Community Server* from
     <https://www.mongodb.com/try/download/community>. On Windows, tick
     "Install MongoDB as a Service" so it starts by itself.
   - **In the cloud (free):** create a free cluster on
     <https://www.mongodb.com/atlas>, then copy its connection string
     (it looks like `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/universe_pos`).

### 2. Set up the backend (server)

Open a terminal in the project folder and run:

```bash
cd server
npm install
```

Create your settings file by copying the example:

```bash
# Mac / Linux
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env
```

Open `server/.env` in your editor and check:

- `MONGO_URI`: leave as is for a local MongoDB, or paste your Atlas connection string.
- `JWT_SECRET`: change it to any long random sentence.

Add the sample data (staff accounts, 7 categories, 23 products, 3 suppliers and 3 customers):

```bash
npm run seed
```

> Already ran the seed in an earlier stage? Run it again. It only adds what is missing.

Start the API server:

```bash
npm run dev
```

You should see `Connected to MongoDB` and `API server running on http://localhost:5000`.
Leave this terminal open.

### 3. Set up the frontend (client)

Open a **second** terminal in the project folder and run:

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

> To use the app from a tablet or phone on the same Wi-Fi, use the
> "Network" address that Vite prints (for example `http://192.168.0.5:5173`).

**Using a phone camera to scan barcodes:** phone browsers only allow the camera on
secure (https) addresses. Stop the client and start it with:

```bash
npm run dev:phone
```

Then open the `https://...` Network address on the phone. The browser will warn that the
certificate is "not private". That is expected for a test certificate on your own
network: tap **Advanced → Proceed**. (On the computer itself, `http://localhost:5173`
works with the webcam without this.)

### 4. Log in with a sample account

| Role    | Username  | Password     | What they can do |
|---------|-----------|--------------|------------------|
| Owner   | `owner`   | `owner123`   | Everything, including staff accounts |
| Manager | `manager` | `manager123` | Checkout, products, categories, suppliers, stock, labels, customers (reports in Stage 6) |
| Cashier | `cashier` | `cashier123` | Checkout only |

**Change these passwords** (Back Office → Staff Accounts → Reset password)
before using the system in a real shop.

### 5. Things to try in Stage 3 (the checkout)

Log in as **cashier**. The checkout opens straight away.

1. **Scan with a USB scanner:** just scan. There is no need to click anywhere first.
   Scanning the same item again adds 1 to its quantity. No scanner? Type a sample
   barcode (below) on the keyboard and press Enter. It works the same way.
2. **Tap products:** tap a card to add one. Tap a category on the right to filter.
   Type in the search box and press Enter to add the only match.
3. **Change the bill:** + and − buttons, type a quantity, or 🗑 to remove. The row you
   just added is highlighted. Switch **Price type** to *Wholesale* to see
   wholesale prices (for example Royal Stallion Rice: ₦12,500 → ₦12,000).
4. **Customer:** type a walk-in name, or press 👤 (F3) to search saved customers
   (try "ada") or add a new one.
5. **Pay** (F10):
   - **Cash:** type the amount received, or tap a quick amount. The change shows in green.
   - **Bank Transfer / Card (POS):** confirm, with an optional reference.
   - **Split:** for example ₦5,000 cash + the rest by transfer ("+ Rest" fills it in).
     Only cash can be more than the bill.
   After paying, the receipt number and the change to give are shown. Press Enter for the next sale.
6. **Unknown barcode:** scan or type `9999999999999`. A friendly message appears.
   Logged in as manager or owner, **Add as New Product** opens the product form with the
   barcode filled in, and saving brings you back to the checkout.
7. **Camera:** press 📷 (F4) to scan several items with the camera, then **Done**.
8. **Refresh the page in the middle of a bill:** the bill is still there.
9. **F1** shows all keyboard shortcuts.
10. **Back office (manager/owner):**
    - **Customers** shows each customer's visits, total spent and purchase history.
    - **Barcode Labels** (or Products → Print Labels): tick "Only products without a barcode",
      enter a number of labels for *Local Ofada Rice*, click **Create barcodes**, then
      **Print**. Choose *A4 sticker sheet* or *Label printer roll (50 × 30 mm)*.

> Selling more than the system says is in stock is allowed (shelf counts are often
> slightly wrong). The bill shows "only X in stock" as a warning, and the Stock Count
> page fixes the numbers.

Feedback, Recall, Return, Hold and Discount show "coming in Stage 4" for now.

### 6. Things to try in Stage 2

Log in as **owner** or **manager** and click **Back Office**.

1. **Dashboard:** 4 low-stock products and 3 expiring products (one already expired)
   from the sample data. Click a card to open the filtered product list.
2. **Products:** search by name or barcode, filter by category, "Low stock only",
   "Expiring / expired only" or "No barcode".
3. **Add Product:** fill in the form and upload a picture (on a phone you can take a photo).
   - Click the barcode box and scan with your USB scanner: the code is typed in and
     the form is **not** submitted by the scanner's Enter key.
   - Or press 📷 to scan with the camera.
   - Using a barcode that another product already has shows a clear error.
   - The form shows the profit per item and warns if the selling price is below cost.
4. **Edit** a product and change its quantity: the change is recorded in stock history.
5. **Categories:** add one with an emoji icon or a picture. Deleting a category that
   still has products is blocked with a message.
6. **Suppliers:** add a supplier, tick the products they supply, and try the call and
   WhatsApp links.
7. **Receive Stock:** scan a barcode (or search by name). The product's usual supplier
   and current cost are filled in. Enter the quantity and click **Add to Stock**.
   The delivery appears under "Recent deliveries".
8. **Stock Count:** scan items. Each scan adds 1, and items without a barcode can be found
   by name. The table shows the difference from the system quantity. Refreshing the page
   keeps your count. **Update Stock to Match Count** corrects the stock.
9. Log in as **cashier**: none of these pages can be opened, and the server hides
   cost prices from cashiers.

**Sample barcodes** (from `server/seedData.js`):
Royal Stallion Rice 5kg = `6150001000012`, Power Oil 1L = `6150002000011`,
Indomie Chicken = `6150003000034`. You can type these into any barcode box and press Enter
to act like a scanner.

### 7. Things to try from Stage 1

1. Log in with a wrong password: you see a clear error message.
2. Log in as **cashier**: you only see the checkout screen. Typing
   `http://localhost:5173/staff` in the address bar sends you back to the checkout.
3. Log in as **manager**: a "Back Office" button appears, with the Dashboard
   but no Staff Accounts page.
4. Log in as **owner**: open Back Office → Staff Accounts, then add a new cashier,
   change a role, disable an account (that person can no longer log in) and reset a password.
5. Refresh the page: you stay logged in. Click **Logout** to sign out.

---

## Folder layout

```
/client                 React app (what staff see in the browser)
  /public               logo and favicon
  /src
    /api/api.js         sends requests to the server with the login token
    /context            AuthContext: remembers who is logged in
    /components         reusable pieces: TopBar, Modal, BarcodeInput, CameraScanner,
                        ImagePicker, ProductSearch, ProductImage, Toast, ...
      /checkout         the parts of the checkout screen (bill, grid, payment box, ...)
    /hooks              useBill (the current bill) and useShortcuts (F-keys)
    /styles             CSS for the checkout screen and barcode labels
    /pages              one file per screen (Products, Categories, Suppliers, ...)
    /utils              small helpers (Naira, dates, stock alerts, image resizing)
    config.js           store name and logo
/server                 Express API
  /config/db.js         connects to MongoDB
  /middleware/auth.js   checks the login token and the user's role
  /models               MongoDB data shapes (User, Category, Product, Supplier, StockMovement,
                        Sale, Customer, Counter)
  /routes               API endpoints (auth, users, categories, products, suppliers, stock,
                        uploads, sales, customers)
  /utils                shared helpers (sale maths, receipt numbers, barcodes, errors, stock history)
  /uploads              uploaded pictures (created automatically, not saved in git)
  seed.js               adds sample data
  seedData.js           the sample data itself - edit it to change test data
  server.js             starts the server
```

## API endpoints so far

| Method | Address | Who | What it does |
|--------|---------|-----|--------------|
| POST | `/api/auth/login` | anyone | Log in, returns a token |
| GET | `/api/auth/me` | logged in | Returns the current user |
| PUT | `/api/auth/change-password` | logged in | Change your own password |
| GET | `/api/users` | owner | List staff |
| POST | `/api/users` | owner | Add staff |
| PUT | `/api/users/:id` | owner | Change name, role, status or password |
| DELETE | `/api/users/:id` | owner | Delete staff |
| GET | `/api/categories` | logged in | List categories with product counts |
| POST / PUT / DELETE | `/api/categories(/:id)` | owner, manager | Add, edit, delete a category |
| GET | `/api/products` | logged in | List products (cost price hidden from cashiers) |
| GET | `/api/products/barcode/:code` | logged in | Find a product by barcode |
| GET | `/api/products/alerts` | owner, manager | Low-stock and expiring products |
| POST / PUT / DELETE | `/api/products(/:id)` | owner, manager | Add, edit, delete a product |
| GET / POST / PUT / DELETE | `/api/suppliers(/:id)` | owner, manager | Manage suppliers |
| POST | `/api/stock/receive` | owner, manager | Add delivered stock to a product |
| POST | `/api/stock/count` | owner, manager | Save a stock count |
| GET | `/api/stock/movements` | owner, manager | Stock history (deliveries, counts, edits) |
| POST | `/api/uploads` | owner, manager | Upload a picture |
| POST | `/api/products/generate-barcodes` | owner, manager | Give in-store barcodes to products without one |
| POST | `/api/sales` | logged in | Complete a sale (prices are taken from the database, not the browser) |
| GET | `/api/sales/:id` | logged in | One sale |
| GET | `/api/customers?search=` | logged in | Find customers (with visits and total spent) |
| POST | `/api/customers` | logged in | Add a customer |
| GET | `/api/customers/:id/sales` | owner, manager | A customer's purchase history |
| PUT / DELETE | `/api/customers/:id` | owner, manager | Edit or delete a customer |

## Common problems

- **"Could not connect to MongoDB"**: MongoDB is not running, or `MONGO_URI` in
  `server/.env` is wrong. On Windows, open *Services* and start "MongoDB Server".
- **"Cannot reach the server"** on the login page: the backend terminal is
  not running. Start it with `npm run dev` inside `/server`.
- **Camera button says "secure (https) address"**: you opened the app on a phone
  over `http://`. Use `npm run dev:phone` and the `https://` address (see step 3).
- **The scanner beeps but nothing is added**: click an empty part of the checkout screen
  (not a text box) and scan again. Also check the scanner is set to send "Enter" after
  each code (most are by default; see its manual).
- **Port already in use**: another program is using port 5000 or 5173. Close it,
  or change `PORT` in `server/.env` (and the proxy address in `client/vite.config.js`).
