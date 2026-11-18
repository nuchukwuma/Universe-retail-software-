# HordeDesk

A till and back office for small shops: supermarkets, pharmacies, boutiques, beauty
shops. It runs on **one Windows laptop** next to a USB or Bluetooth barcode scanner and
keeps every sale, product and setting **on that laptop**. It works without internet.

- **Website:** a landing page with a **browser demo** (no sign-in, sample shop with 30
  days of sales) and a **Download for Windows** button. See *The website* below.
- **Desktop app:** Electron 22, in `/desktop` (the window, printing, the installer).
- **Screens:** React (Vite), in `/client`.
- **Server:** Node.js + Express, in `/server`, running inside the desktop app.
- **Data:** the app's own data files (`/server/db`). No database program to install.

What it does:

- **Till:** product tiles by category (with optional pictures), barcode scanning, typing
  a name with live suggestions, held bills as tabs, discounts (large ones need a manager),
  returns, receipts on 58mm, 80mm or A4.
- **Stock:** products with cost and selling price, add stock by scanning or typing,
  stock counts, low-stock lists, categories.
- **Suppliers and purchase orders:** order from a supplier, receive deliveries in full or
  in part (stock and cost prices update), cancel.
- **Profit:** each sale keeps the cost of what was sold, so reports show cost of goods and
  profit (daily, weekly, best sellers, the Today page). Export to Excel.
- **Staff:** owner, manager and cashier accounts. Cashiers never see cost prices.
- **Backups:** automatic daily backups (to a USB drive), restore on a new laptop.
- **Optional:** a Telegram message after every sale (the only thing that uses internet).

The design rules (colours, type, the till layout) are in [DESIGN.md](DESIGN.md).

---

## Installing on a shop laptop

### What the laptop needs

- **Windows 8.1, 10 or 11, 64-bit.** (Plain Windows 8 should be updated to 8.1 first.)
- About **2 GB of free disk space**, plus room for backups.
- A **USB flash drive** for backups (strongly recommended).
- Optional: a barcode scanner, a 58mm or 80mm receipt printer.

### Step 1: download

Click **Download for Windows** on the website, or download `HordeDesk-Setup.exe` from the
repository's **Releases** page (the newest release is always at
`https://github.com/nuchukwuma/Universe-retail-software-/releases/latest/download/HordeDesk-Setup.exe`).

### Step 2: install

1. Double-click `HordeDesk-Setup.exe`.
2. Windows may say *"Windows protected your PC"* (the app is not signed by a paid
   certificate). Click **More info → Run anyway**.
3. Follow the steps. A **HordeDesk** icon appears on the desktop.

### Step 3: set up the shop

The first start shows **Set up your shop**: the shop name, your name, a username and a
password for the owner account, three **password recovery questions** (they let you choose
a new password if you forget it), and optionally a set of **sample products** to practise
with (general store, or beauty and cosmetics).

Moving to a new laptop? Click **Restore a backup** on that screen instead, choose the
folder (for example the USB drive) holding the backup folders, and restore the newest one.

Then, signed in as the owner:

1. **Staff:** add managers and cashiers, each with their own username and password.
2. **Settings:** the shop's **logo** (optional, shown in the app and on receipts), address,
   phone, the message at the bottom of receipts, the receipt paper size and printer, and
   the largest discount a cashier can give alone.
3. **Backup:** choose the USB drive as the backup folder. Do this on day one.
4. **Suppliers, Categories, Products / Add stock:** enter your stock.

### Coming from Universe POS (versions 1.x)

HordeDesk is the new name of Universe POS. Install HordeDesk as above. On its first start
it **copies the shop's data** from the old `Universe POS` folder (nothing there is deleted),
so all products, sales, staff, passwords and settings carry on. You can then uninstall
Universe POS from *Programs and Features*. (Make a backup first, just in case.)

---

## Using HordeDesk

### The till (Sell)

- **Bill on the left, products on the right.** Tap a category, then a product tile to add
  one. Tiles show a picture when the product has one, otherwise its initials on its
  category's colour, with the price and how many are in stock.
- **Scan** at any time; there is no need to click first. Scanning again adds 1.
- **Type a name** in the same box (`palm`, `nivea`, `cocoa but`): matching products appear
  as you type. **Enter** adds the highlighted one, **Up/Down** choose, or click.
- **Held bills are tabs** above the bill. **Hold (F6)** parks the bill (give it a name if you
  like) and starts a new one. Click a held bill's tab to switch to it: the bill you were on
  is held in its place. The **x** on a tab deletes that held bill.
- **Discount (F8):** on one line or the whole bill. Above the cashier limit (Settings), a
  manager types their username and password on the till.
- **Complete sale (F10, then Enter):** the sale is saved and the receipt is shown, or printed
  straight away if Settings says so.
- **Return:** scan or type the receipt number, choose the items and a reason. A cashier's
  return needs a manager. The items go back into stock and a refund slip prints.
- **F1** lists every shortcut. **Esc** closes a window, or puts the cursor in the scan box.

### Stock and suppliers (owner and manager)

- **Products:** search and filter; scan a product to open it, scan an unknown barcode to add
  it. Each product can have a picture, a cost price (the form shows the profit on each one)
  and a supplier.
- **Add stock:** scan or type what arrived, with its cost and supplier if you like; a new
  barcode or an unknown name becomes a new product.
- **Purchase orders:** **New order**, choose the supplier, add products (or **Add low-stock
  items** for that supplier), quantities and cost each. When the delivery comes, open the
  order and **Receive delivery**: all of it, or what actually arrived. Stock goes up, the cost
  price is updated and the order shows *Part received* or *Received*.
- **Suppliers:** names, phone numbers, how many products and open orders each has.
- **Stock count:** scan everything on a shelf, then set the stock to what you counted.

### Today and reports (owner and manager)

- **Today:** takings and profit today, this week and this month, what is running low and
  what is selling.
- **Reports:** daily sales, weekly sales, by cashier, best sellers and stock levels, each
  with quick date buttons and **Export to Excel**. Daily sales and best sellers show
  **cost of goods** and **profit**. If items were sold before they had a cost price, a warning
  says how many (their profit would show too high).
- **Takings** = what customers paid after discounts, minus refunds. Days run midnight to
  midnight, Lagos time.

### Who can do what

| Role | Can do |
|------|--------|
| Owner | Everything, including Staff, Settings, Telegram and Backup |
| Manager | The till, products, stock, suppliers, purchase orders, returns, any discount, Today and reports |
| Cashier | The till, Sales history, End of day. Returns and big discounts need a manager. Never sees cost prices or profit |

### Backups

- An **automatic backup** is made once a day; the newest 30 are kept.
- **Backup** page: choose the folder (your USB drive), **Back up now** at closing time,
  **Restore** a backup (type `RESTORE` to confirm; a safety copy is made first).
- Backups include product pictures and the logo.
- The Today page warns the owner when there has been no backup for 2 days, or the last one
  failed (for example the USB drive was not plugged in).

### Telegram sales alerts (optional)

After every sale the app can send a message with the items and total to a Telegram group.

1. In Telegram, open **@BotFather**, send `/newbot`, and keep the **token** it gives you.
2. Add the bot to your group and send `/start` there.
3. In HordeDesk: **Settings → Telegram sales alerts**: paste the token, **Find my chat id**,
   **Use this chat**, save, then **Send a test message**.

The till never waits for Telegram: if the internet is down, alerts are sent later.

### The barcode scanner

Any USB or Bluetooth scanner that types like a keyboard works with no setup, as long as it
sends **Enter** after each code (the factory setting on nearly all of them). The app tells a
scanner from typing by speed, so a scan works even when the cursor is in another box.
If the line under the scan box says **Scanner paused**, click inside the app window or
press **Esc**.

### Forgot your password?

- **The owner:** on the sign-in screen, **Forgot your password?**, then answer the three
  recovery questions and choose a new password. After 5 wrong tries, answering pauses for
  15 minutes. Set or change the questions in **Settings**.
- **Managers and cashiers:** ask the owner to reset it on the **Staff** page.

### Where things are saved

| What | Where |
|------|-------|
| Sales, products, staff, settings | `%APPDATA%\HordeDesk\data` |
| Product pictures and the logo | `%APPDATA%\HordeDesk\images` |
| Backups (until you choose a USB drive) | `%APPDATA%\HordeDesk\backups` |
| Log file | `%APPDATA%\HordeDesk\logs\hordedesk.log` |
| App settings (port, sign-in secret) | `%APPDATA%\HordeDesk\config.json` |

`%APPDATA%` is usually `C:\Users\<your name>\AppData\Roaming`. **Ctrl + Shift + D** in the
app opens this folder.

### Updating

Back up, close HordeDesk, run the new `HordeDesk-Setup.exe`. Your data is kept (it is in
the data folder, not in the app). On its first start a new version tidies data saved by older
versions by itself, after making its own safety backup.

### A note on security

The app uses Electron 22 (the last version that runs on Windows 8.1), which no longer gets
security updates, and neither does Windows 8.1. The app only shows its own screens from the
laptop itself, so this is acceptable, but use the shop laptop only for the shop, keep
backups on a USB drive, and move to a Windows 10/11 laptop (install, then restore a backup)
when you can.

---

## The website

`/site` holds the landing page (`index.html`, `styles.css`, screenshots in `images/`).
`npm run build:demo` (in `/client`) builds the **browser demo** into `site/demo`:

- `demo/build.mjs` bundles the **real server code** (routes, models, reports) for the
  browser with esbuild. The parts that need a computer are swapped for browser versions
  (`demo/api/replacements`): data files → the browser's storage, pictures → kept in the
  browser, backups and Telegram → "made by the desktop app". Node modules get small
  stand-ins (`demo/api/shims`).
- In demo mode (`client/.env.demo`), every `/api` request is answered inside the page
  (`client/src/demo/installDemo.js`). The first visit sets up *Corner Mart* with the general
  store sample products, three staff, 30 days of sales and two purchase orders (about
  half a second). Visitors are signed in straight away; the sidebar has a role switcher
  (Owner, Manager, Cashier) and **Start again**. Their changes stay in their own browser.
- The normal build and the desktop app contain none of the demo code.

**Publishing:** `.github/workflows/pages.yml` builds the demo and publishes the site on
GitHub Pages on every push to `hordedesk`. One-time setup in the repository's settings:

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Environments → github-pages:** allow the `hordedesk` branch to deploy (or
   make `hordedesk` the default branch).

**The download:** `.github/workflows/build-windows.yml` builds `HordeDesk-Setup.exe` on every
push (Actions tab → the run → Artifacts). To publish it as a **release** (which the website's
Download button points to): Actions → **Build Windows installer** → **Run workflow**, tick
**Publish a release**. It is tagged with the version in `desktop/package.json` (for example
`v2.0.0`). Pushing a tag such as `v2.0.1` does the same.

---

## For developers

You need **Node.js 18 or newer**. The server keeps its data in `server/data` (development)
or the app's data folder (desktop app).

### Run in development (two terminals)

```bash
# Terminal 1: the server, on http://localhost:5000
cd server
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run seed                  # optional: sample staff and products (general store;
                              # "npm run seed beauty" for the beauty set)
npm run dev

# Terminal 2: the screens, on http://localhost:5173
cd client
npm install
npm run dev
```

With `npm run seed`, sign in as `owner` / `owner123`, `manager` / `manager123` or
`cashier` / `cashier123`. Without it, the setup screen appears.

### The browser demo

```bash
cd server && npm install && cd ..
cd client && npm install
npm run build:demo             # -> site/demo
cd ../site && python3 -m http.server 8080   # then open http://localhost:8080/
```

### Run the desktop app / build the installer

```bash
cd client && npm run build && cd ../desktop
npm install
npm start          # copies server + client into desktop/app and opens the app
npm run dist       # on Windows: desktop/dist/HordeDesk-Setup.exe
```

The installer contains **Electron 22.3.27** (Chromium 108, Node 16.17), the last Electron
for Windows 7/8/8.1. Keep it at that version; the server code must therefore run on
**Node 16** (no `fetch()`, keep mingo at 6.7.2).

### How the data is kept (`server/db`)

- Each kind of record has one file, e.g. `sales.1.jsonl`: the records, a line saying the list
  is complete, then one line per change. Every change is written and confirmed by the disk
  before the app carries on, so a power cut loses nothing saved.
- Files with many old changes are rewritten under the next number; files are never renamed
  (Windows antivirus can block renames). Only one copy of the app can open the data
  (`in-use.lock`).
- Models (`server/models`) work like Mongoose models; filters and reports use MongoDB-style
  queries run by [mingo](https://github.com/kofrasa/mingo).
- Product pictures and the logo are files in `images/`, served at `/api/images/<name>`.

Versions 1.2.0 and earlier used MongoDB: `npm run import-mongodb` (in `/server`) writes a
normal backup folder from a MongoDB or Atlas database, which can then be restored.

### Folder layout

```
/site                 the website: landing page, screenshots; the demo is built into site/demo
/demo                 builds the server code for the browser demo (build.mjs, api/)
/desktop              the Windows app (Electron)
  main.js             starts the server inside the app and opens the window
  /electron           config.json + log file, printing, menu, copying "Universe POS" data
  /build              the program icon
/client               React screens
  /src/components     AppShell (sidebar), /checkout (till, tiles, held-bill tabs), /receipts,
                      /returns, /reports, /settings, PictureField, ProductThumb, ...
  /src/pages          one file per screen
  /src/styles         tokens.css (colours, type, spacing), base, components, layout, pos, receipt
  /src/demo           the demo hookup (installDemo.js) and the generated server bundle
/server               Express API
  /db                 the app's own data files
  /models             User, Product, Sale, Supplier, Purchase, StockMovement, ...
  /routes             API endpoints
  /utils              sale maths, reports, images, backups, migrations, Telegram, ...
  seedData.js         the sample product sets (general store, beauty)
/.github/workflows    the Windows installer and release; the website
```

### API endpoints

| Method | Address | Who | What it does |
|--------|---------|-----|--------------|
| GET | `/api/setup/status` | anyone | First start? Which sample sets exist |
| POST | `/api/setup` | anyone, before any staff exist | Owner account, recovery questions, shop name, sample set |
| GET / POST | `/api/setup/backups`, `/api/setup/restore` | anyone, before any staff exist | Restore a backup on a new install |
| POST | `/api/auth/login`, GET `/api/auth/me` | anyone / logged in | Sign in, who am I |
| PUT | `/api/auth/change-password`, `/api/auth/security-questions` | logged in / owner | Own password, recovery questions |
| GET / POST | `/api/auth/recovery-questions`, `/api/auth/recover` | anyone | Forgot password (owner) |
| POST | `/api/auth/approve` | logged in | A manager's approval on a cashier's till |
| GET / POST / PUT / DELETE | `/api/users(/:id)` | owner | Staff |
| GET / POST / PUT / DELETE | `/api/categories(/:id)` | logged in / owner, manager | Categories |
| GET | `/api/products`, `/api/products/:id`, `/api/products/barcode/:code` | logged in | Products (cost price left out for cashiers) |
| POST / PUT / DELETE | `/api/products(/:id)` | owner, manager | Manage products (cost price, supplier) |
| PUT / DELETE | `/api/products/:id/picture` | owner, manager | A product's picture (data URL) |
| GET | `/api/images/:name` | anyone | A product picture or the logo |
| POST | `/api/stock/receive` (`unitCost`, `supplierId` optional), `/api/stock/count` | owner, manager | Add stock, save a count |
| GET | `/api/stock/movements` | owner, manager | Stock history |
| GET / POST / PUT / DELETE | `/api/suppliers(/:id)` | owner, manager | Suppliers (with product counts and open orders) |
| GET / POST / PUT | `/api/purchases(/:id)` | owner, manager | Purchase orders (`?status=&supplier=`) |
| POST | `/api/purchases/:id/receive`, `/api/purchases/:id/cancel` | owner, manager | Receive a delivery (all or some lines), cancel |
| POST / GET | `/api/sales`, `/api/sales/:id`, `/api/sales/by-receipt/:number` | logged in | Complete and find sales |
| POST | `/api/sales/:id/printed` | logged in | Count a print (later ones say DUPLICATE COPY) |
| GET / POST | `/api/returns` | logged in (manager approval to POST) | Returns |
| GET / POST / DELETE | `/api/held-bills(/:id)` | logged in | Held bills |
| GET / PUT | `/api/settings` | anyone / owner | Shop settings |
| PUT / DELETE | `/api/settings/logo` | owner | The shop's logo |
| GET | `/api/reports/end-of-day` | logged in | End of day |
| GET | `/api/reports/dashboard`, `daily-sales`, `weekly-sales`, `cashiers`, `best-sellers`, `stock-levels` | owner, manager | Today and reports (with cost of goods and profit) |
| GET / PUT / DELETE / POST | `/api/telegram/...` | owner | Telegram alerts |
| GET / POST / PUT | `/api/backups`, `/api/backups/settings`, `/api/backups/restore` | owner | Backups |

## Common problems

- **"HordeDesk could not start"**: make sure it is not already open in another window, then
  press **Try again**. Still not working: restart the laptop and check the disk is not full.
  Otherwise press **Open log folder** and look at `hordedesk.log`.
- **Receipts do not print**: check the printer is on, and that Settings → **Receipt printer**
  shows the right printer (it says *(not found)* if Windows cannot see it).
- **Receipt too long, short or cut off**: make the **paper size** in Settings match the
  printer (58mm or 80mm), and the roll width in the printer's Windows settings.
- **Backup failed**: the USB drive is not plugged in, or has a different letter now. Plug it
  in, or choose the folder again on the Backup page.
- **The scanner beeps but nothing is added**: if it says **Scanner paused**, click inside the
  window or press **Esc**; check the scanner sends Enter after each code.
- **"No product has the barcode ..."**: open the product on the Products page and scan the
  barcode into it, or use **Add as a new product**.
- **Telegram "Unauthorized" or "chat not found"**: copy the token again from @BotFather, or
  use **Find my chat id** again (group ids start with `-100`).
- **The demo looks empty or odd**: click **Start again** in the sidebar.
