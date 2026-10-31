# Universe POS

A point-of-sale and shop management app for **Universe Cosmetics & Beauty Skincare**, made to be
installed on **one Windows laptop** next to a USB or Bluetooth barcode scanner.
Everything (sales, products, staff, backups) is saved **on that laptop only**.
Nothing is stored online.

The screens are text, tables and colour only: no icons, pictures or logos. The design
rules (typeface, colours, spacing, the till layout) are in [DESIGN.md](DESIGN.md).

- **Desktop app:** Electron, in `/desktop` (the window, printing, the installer)
- **Screens:** React (built with Vite), in `/client`
- **Server:** Node.js + Express, in `/server`, which runs inside the desktop app
- **Database:** MongoDB, installed on the same laptop

The only thing that ever goes online is the optional **Telegram sales alert**, and the
owner can switch it off.

## Build progress

| Stage | What it adds | Status |
|------:|--------------|--------|
| 1 | Project setup, login and roles | ✅ Done |
| 2 | Products, categories and inventory | ✅ Done |
| 3 | Checkout screen and barcode scanning | ✅ Done |
| 4 | Receipts and printing, hold/recall, returns, discounts | ✅ Done |
| 5 | Telegram sales alerts | ✅ Done |
| 6 | Reports and Excel export | ✅ Done |
| 7 | Desktop app for Windows 8: installer, first-run setup, backups, direct printing | ✅ Done |
| 8 | Redesign: new look, keyboard-wedge scanner, simpler products and sales | ✅ Done |
| 9 | Add stock by scanning (new products too), new typefaces, tidier menu | ✅ Done |
| 10 | Redesign in the shop's own brand: the logo's black and aqua, its slab-serif lettering, skincare sample products | ✅ Done |

Removed along the way: the public website (the app is offline), WhatsApp sharing, the
camera scanner, pictures and logos, expiry dates, suppliers, cost prices and profit,
wholesale prices, payment methods (a sale is just a sale), customers and customer
feedback, staff names on receipts, end-of-day printing and barcode label printing.
The only thing the app prints is the customer's receipt (and the return slip, which is
the customer's refund receipt).

When the updated app first starts on a computer that has data from an older version, it
makes a **safety backup** (reason "before-update") and then removes the old fields and
tables (customers, feedback, suppliers, ...). No sale, total or stock figure is lost.

---

## Installing on the shop laptop

### What the laptop needs

- **Windows 8.1, 64-bit.** (Plain Windows 8 should first be updated to 8.1 for free
  through the Windows Store. MongoDB does not support 32-bit Windows.)
  To check: press **Windows key + Pause/Break**. Under *System* you should see
  **Windows 8.1** and **64-bit Operating System**.
- About **2 GB of free disk space**, plus room for backups.
- A **USB flash drive** for backups (strongly recommended).
- Windows 10 or 11 also work, with the same steps.

### Step 1: install MongoDB 4.2 (the database), one time only

MongoDB 4.2 is the newest MongoDB that runs on Windows 8.1. Newer versions do not.

1. Open the MongoDB download archive:
   <https://www.mongodb.com/try/download/community-edition/releases/archive>
2. Find **4.2.25** (the last 4.2 version), *Windows x64*, and download the **.msi** file.
3. Run it and choose:
   - **Complete** setup.
   - Keep **"Install MongoD as a Service"** ticked, with **"Run service as Network Service user"**.
     This makes MongoDB start by itself every time the laptop is switched on.
   - **Untick "Install MongoDB Compass"**. It is not needed.
4. Check it worked: press the Windows key, type `services.msc` and press Enter.
   **MongoDB Server** should say *Running*.

> If the installer says a file such as `VCRUNTIME140.dll` or `api-ms-win-crt` is missing,
> run **Windows Update** until no updates are left (in particular update **KB2999226**),
> install the **Microsoft Visual C++ Redistributable (x64)**, then run the MongoDB installer again.

### Step 2: get the Universe POS installer

The installer is a file called `Universe-POS-Setup-1.0.0.exe`. GitHub builds it for you
on a Windows computer every time the code changes:

1. On GitHub, open this repository and click the **Actions** tab.
2. Click the newest **"Build Windows installer"** run with a green tick.
3. At the bottom, under **Artifacts**, download **Universe-POS-Setup** (a .zip file).
4. Unzip it and copy the `.exe` onto the shop laptop (a USB drive works).

(Developers can also build it themselves. See "For developers" below.)

### Step 3: install Universe POS

1. Double-click `Universe-POS-Setup-1.0.0.exe`.
2. Windows may say *"Windows protected your PC"*, because the app is not signed by a
   paid certificate. Click **More info → Run anyway**.
3. Follow the steps. A **Universe POS** icon appears on the desktop.

### Step 4: first start

1. Open **Universe POS** from the desktop icon. It opens full-size.
2. The first time, it shows **Welcome! Let's set up the shop**:
   - the shop name (printed on receipts),
   - your name, a **username** and a **password** for the owner account.
     *Write them down and keep them somewhere safe.*
   - Tick **"Add sample products"** if you want practice products. You can delete them later.
3. Click **Start using the app**. You are logged in as the owner.

If you see **"Universe POS could not start"**, MongoDB is not running. The screen explains
what to do and tries again by itself every 20 seconds.

### Step 5: set up the shop

All of these are in **Back Office** (button at the top), logged in as the owner:

1. **Staff:** add your managers and cashiers, each with their own username and password.
2. **Settings:**
   - Store address, phone and the message at the bottom of receipts.
   - **Receipt paper size:** 80mm, 58mm or A4.
   - **Receipt printer:** choose your receipt printer from the list. Receipts then print
     **straight away, with no print window**. (Choose "Show the print window each time"
     if you want to pick the printer every time.) Click **Save Settings**, then
     **Print test receipt**.
   - **Print the receipt as soon as a sale is completed:** skips the receipt preview.
3. **Backup and restore:** see below. Do this on day one.
4. **Categories, then Add stock:** enter your stock with the scanner (see
   *Adding stock with the scanner* below).

### Backups (important!)

Because the data is only on this laptop, a broken or stolen laptop would lose everything
**unless you have a backup somewhere else**.

- The app makes an **automatic backup once a day** and keeps the newest 30.
- Back Office → **Backup & Restore**:
  - **Choose folder…** and pick your **USB drive** (for example `E:\Shop Backups`),
    then **Save folder**. Leave the USB drive plugged in, or plug it in daily.
  - **Back up now** makes a backup straight away. Do this at closing time.
  - **Open folder** shows the backups in Windows Explorer.
- If the USB drive is missing when a backup is due, the backup fails safely, and the owner
  sees a warning on the Today page and the Backup page. Plug the drive in and press
  **Back up now**.
- The Today page also warns the owner when there has been no backup for 2 days.
- Every few weeks, copy the newest backup folder to a second place (another USB drive,
  or a computer at home).

**Restoring** (for example on a new laptop):

1. Install MongoDB and Universe POS on the new laptop (Steps 1 to 4).
2. Back Office → Backup & Restore → **Choose folder…** → pick the folder that *contains*
   the `universe-pos-backup-...` folders → **Save folder**.
3. Click **Restore…** next to the backup you want and type `RESTORE`.
   Everything (sales, products, staff, settings) is replaced with the backup.
   A safety copy of the data from before the restore is saved first, so it can be undone.
4. Log in again with the usernames and passwords from the backup.

### Telegram sales alerts (optional, needs internet)

After every sale, the app can send a message like this to a Telegram group:

```
New sale at Universe Cosmetics & Beauty Skincare
Receipt: 261027-0001
Time: 27 Oct 2026, 9:13
Cashier: Amaka Cashier

Nivea Body Lotion 400ml: 2 at ₦6,500 = ₦13,000
Zaron Pressed Powder: 1 at ₦9,000 = ₦8,550 (discount ₦450)

Subtotal: ₦22,000
Discount: ₦450
Total: ₦21,550
```

1. **Create the bot:** in Telegram, open **@BotFather** (blue tick), send `/newbot`, give it
   a name and a username ending in `bot`. It replies with a **token** like `7123456789:AAH...`.
   Keep it secret.
2. **Add the bot to your group** (for example *Shop Sales*) and send `/start` in the group.
3. In Universe POS: Back Office → **Settings** → **Telegram sales alerts**:
   - Paste the token into **Bot token** and click **Save Telegram details**.
   - Click **Find my chat id**, press **Use this chat** next to your group, then **Save Telegram details** again.
   - Click **Send a test message**. It should arrive within a few seconds.
4. The tick box **"Send a Telegram message after every sale"** switches alerts on and off.

The till never waits for Telegram. **If the internet is down, sales still complete**, and the
alerts are sent later by themselves. The token is saved only on the laptop and is never shown again.

### The barcode scanner

Any **USB or Bluetooth barcode scanner** that works as a keyboard (almost all of them)
works with no setup. It must send **Enter** after each code, which is the factory setting
on nearly every scanner.

- **On the till (Sell):** the barcode box at the top is always ready. The line under it
  says **Scanner ready**. Scan, and the product is added to the bill (scanning it again
  adds 1 more). An unknown barcode shows **Product not found** and nothing is added.
- **Typing instead of scanning:** type the barcode in the box and press Enter. If you type
  a word instead (for example "nivea"), the Find product window opens with that word.
- **The app tells scanner from typing** by speed: a scanner types a whole code in a few
  milliseconds. So a scan still works when the cursor is in another box (for example a
  quantity), and the code is never left behind in that box.
- **Other pages that take scans:** Products (opens the product, or starts a new one with
  that barcode), Add/Edit product (fills in the barcode), Add stock (adds 1, or starts a
  new product), Stock count (adds 1 to the count), Sales history (scan a receipt to find it),
  and Return (scan the receipt).
- If the line says **Scanner paused**, click anywhere in the app window (another program
  had the keyboard) or press **Esc** on the till.

### Adding stock with the scanner

Back office → **Stock → Add stock**. No need to click anything first: just scan.

- **A product the shop already has:** it appears with **How many arrived: 1**. Scan it
  again for each extra one, or type the number, then press **Enter** (Add to stock).
- **A barcode the shop does not have yet:** a **New product** form opens with the barcode
  filled in. Type the name and selling price (category and low-stock level are optional),
  scan the same item again for each extra one or type how many arrived, then press
  **Enter** (Save product and add to stock). Next time it is scanned, at the till or here,
  the app knows it.
- **No barcode on the item:** use **No barcode? Find it by name**.
- **Recently added** at the bottom shows the last deliveries and who added them.

**Testing a scanner:** open Notepad, scan a barcode. The digits should appear and the
cursor should jump to a new line. If no new line appears, scan the "Enter suffix" or
"CR suffix" setup code in the scanner's manual.

### Keyboard shortcuts

On the till: **F1** shows the list (F2 find product, F6 hold, F7 recall,
F8 discount, F9 cancel bill, F10 complete sale, then Enter to confirm). **Esc** closes a
window, or puts the cursor back in the barcode box.

Anywhere in the app:

| Keys | What it does |
|------|--------------|
| F11 | Full screen on/off |
| Ctrl + R | Reload the screen |
| Ctrl + `+` / Ctrl + `-` / Ctrl + 0 | Bigger / smaller / normal text |
| Ctrl + Shift + D | Open the app's data folder |
| Ctrl + Q | Close the app |

### Where things are saved on the laptop

| What | Where |
|------|-------|
| Sales, products, staff, settings | MongoDB's own folder (`C:\Program Files\MongoDB\Server\4.2\data`) |
| Backups (until you choose a USB drive) | `%APPDATA%\Universe POS\backups` |
| Log file (for finding problems) | `%APPDATA%\Universe POS\logs\universe-pos.log` |
| App settings (port, database address) | `%APPDATA%\Universe POS\config.json` |

(`%APPDATA%` is usually `C:\Users\<your name>\AppData\Roaming`. Type it into the
Windows Explorer address bar to open it.)

### Updating the app

Run the new `Universe-POS-Setup-x.y.z.exe`. Your data is kept. Make a backup first, just in case.

### A note on security

Windows 8.1 stopped getting security updates from Microsoft in January 2023, and the
version of Electron the app uses (22, the last one for Windows 8) no longer gets updates
either. This is acceptable here because the app only shows its own screens from the
laptop itself and does not browse the web. To stay safe:

- Use the laptop only for the shop: no web browsing, email or downloads on it.
- Keep backups on a USB drive.
- When the shop gets a Windows 10/11 laptop, install the same app there and **restore**
  the newest backup.

---

## For developers

You need a computer with **Node.js 18 or newer** and **MongoDB** (any version from 4.2).
(The development tools do not run on Windows 8. The finished app does.)

### Run in development (two terminals)

```bash
# Terminal 1: the server, on http://localhost:5000
cd server
npm install
cp .env.example .env          # Windows: copy .env.example .env
npm run seed                  # optional: sample staff and products
npm run dev

# Terminal 2: the screens, on http://localhost:5173
cd client
npm install
npm run dev
```

Open <http://localhost:5173>. With `npm run seed`, you can log in as
`owner` / `owner123`, `manager` / `manager123` or `cashier` / `cashier123`.
Without it, the first-run setup screen appears.

In a web browser the print window opens for every receipt. Direct printing only works in
the desktop app.

### Run the desktop app

```bash
cd client && npm run build && cd ..
cd desktop
npm install
npm start          # copies server + client into desktop/app, then opens the app
```

It uses the MongoDB at `mongodb://127.0.0.1:27017/universe_pos`. To use another one, edit
`mongoUri` in `config.json` in the app's data folder.

### Build the Windows installer

On a **Windows** computer:

```bash
cd desktop
npm install
npm run dist       # builds the client, then makes desktop/dist/Universe-POS-Setup-1.0.0.exe
```

Or push to GitHub: `.github/workflows/build-windows.yml` builds it on a Windows machine
and attaches it to the run (see Step 2 above). It can also be started by hand from the
Actions tab ("Run workflow").

The installer contains **Electron 22.3.27** (Chromium 108, Node 16.17), the last Electron
that runs on Windows 7/8/8.1. Keep it at that version. The server code must therefore work
on **Node 16**: no `fetch()` (use `server/utils/postJson.js`) and mongoose 7.

---

## Things to try

Sign in as the owner, add a manager and a cashier on the **Staff** page, and tick
"Add sample products" at setup (or run `npm run seed` in development) so there is
something to sell.

### The till (Sell)

1. **Scan:** just scan. There is no need to click first. Scanning the same item again adds
   1. The line that was just scanned turns yellow. No scanner? Type a sample barcode and
   press Enter: CeraVe Hydrating Cleanser 236ml = `6150001000012`, Nivea Body Lotion 400ml =
   `6150002000011`, House of Tara Lip Gloss = `6150003000034`. Try `9999999999999` to see
   **Product not found**.
2. **Find product (F2):** for items without a barcode. Type part of the name, choose with
   the arrow keys, Enter adds it. Category buttons narrow the list.
3. **Change the bill** with **-** and **+**, type a quantity, or **Remove** a line.
4. **Complete sale (F10, then Enter):** the sale is saved and the receipt is shown (or
   printed straight away if Settings says so). The first print is the original; later
   prints from Sales history say **\*\*\* DUPLICATE COPY \*\*\***.
5. **Discount (F8):** up to 10% (changeable in Settings) a cashier can give alone. Above
   that, a manager types their username and password on the till.
6. **Hold (F6) / Recall (F7):** park a bill (with a note if you like), serve the next customer, bring it back later.
7. **Return:** scan the barcode at the bottom of a receipt, choose the items and the
   reason, and a manager approves. A return slip prints and the items go back into stock.
8. **Sales history** and **End of day** (the day's sales, refunds and takings, on screen).

### Stock (manager / owner)

- **Products:** search and filter (low stock, out of stock, no barcode). Scan any product to
  open it; scan an unknown barcode to add it as a new product.
- **Add stock:** scan what arrived; a new barcode becomes a new product (see above).
- **Stock count:** scan everything on the shelf (each scan adds 1), then
  **Set stock to my count**.

### Today and reports (manager / owner)

- **Today:** takings today compared with yesterday, this week, this month, what is running
  low, today's best sellers and the last 7 days.
- **Reports:** daily sales, weekly sales, by cashier, best sellers and stock levels (with
  days of stock left). Each has quick date buttons and **Export to Excel**.
- **Sales total** = what customers paid after discounts. **Takings** = sales total minus
  refunds. In reports, a refund counts on the day of the original sale; on the End of day
  page it counts on the day the money was given back. Days run midnight to midnight,
  Lagos time.

### Who can do what

| Role | Can do |
|------|--------|
| Owner | Everything, including Staff, Settings, Telegram and Backup and restore |
| Manager | The till, products, stock, returns, any discount, Today and reports |
| Cashier | The till, Sales history, End of day. Returns and big discounts need a manager's password |

---

## Folder layout

```
/desktop                The Windows app (Electron)
  main.js               starts the server inside the app and opens the window
  preload.js            the few extra powers the screens get (print, printers, folders)
  loading.html          "Starting Universe POS..." screen
  error.html            shown when MongoDB is not running, with "Try again"
  /electron             config.json + log file, printing and folder handlers, keyboard shortcuts
  /scripts/copy-app.js  copies /server and /client/dist into desktop/app before packing
  /build                the Windows program icon (taskbar and desktop shortcut only)
/client                 React screens
  /src
    /api/api.js         sends requests to the server with the login token
    /context            AuthContext (who is logged in), SettingsContext (store settings),
                        PrintContext (prints a receipt: directly in the desktop app,
                        or with the print window in a browser)
    /components         reusable pieces (TopBar, Modal, PageHeader, BarcodeInput,
                        ScannerStatus, ...) and /checkout, /receipts, /returns, /reports, /settings
    /hooks              useBill (the current bill), useShortcuts (F-keys),
                        useScanner (tells a barcode scanner from typing)
    /pages              one file per screen (Products, Backup, Settings, ...)
    /styles             tokens.css (all colours, type and spacing), base, components,
                        layout, pos (the till) and receipt
    /utils              small helpers (Naira, dates, desktop app check, ...)
/server                 Express API
  app.js                builds the app and starts it (used by the desktop app and server.js)
  server.js             starts the server in development
  /config/db.js         connects to MongoDB
  /middleware/auth.js   checks the login token and the user's role
  /models               MongoDB data shapes (User, Product, Sale, Return, Settings, ...)
  /routes               API endpoints
  /utils                shared helpers (sale maths, reports, Telegram, backups,
                        migrations = tidying data saved by older versions, ...)
  seed.js, seedData.js  sample data for development
/.github/workflows      builds the Windows installer on GitHub
```

## API endpoints

| Method | Address | Who | What it does |
|--------|---------|-----|--------------|
| GET | `/api/setup/status` | anyone | Is this the very first start (no staff yet)? |
| POST | `/api/setup` | anyone, only before any staff exist | First-run setup: owner account and shop name |
| POST | `/api/auth/login` | anyone | Log in, returns a token |
| GET | `/api/auth/me` | logged in | The current user |
| PUT | `/api/auth/change-password` | logged in | Change your own password |
| POST | `/api/auth/approve` | logged in | A manager's password check on a cashier's till (30-minute approval) |
| GET / POST / PUT / DELETE | `/api/users(/:id)` | owner | Staff accounts |
| GET | `/api/categories` | logged in | Categories with product counts |
| POST / PUT / DELETE | `/api/categories(/:id)` | owner, manager | Manage categories |
| GET | `/api/products` | logged in | Products: name, barcode, category, selling price, stock, low-stock level |
| GET | `/api/products/barcode/:code` | logged in | Find a product by barcode |
| POST / PUT / DELETE | `/api/products(/:id)` | owner, manager | Manage products |
| POST | `/api/stock/receive`, `/api/stock/count` | owner, manager | Add stock that arrived, save a stock count |
| GET | `/api/stock/movements` | owner, manager | Stock history |
| POST | `/api/sales` | logged in | Complete a sale (prices come from the database) |
| GET | `/api/sales?search=&from=&to=`, `/api/sales/:id`, `/api/sales/by-receipt/:number` | logged in | Find sales |
| POST | `/api/sales/:id/printed` | logged in | Count a print (later prints say DUPLICATE COPY) |
| GET / POST | `/api/returns` | logged in (manager approval needed to POST) | Returns |
| GET / POST / DELETE | `/api/held-bills(/:id)` | logged in | Hold and recall bills |
| GET | `/api/settings` | anyone | Store settings (never includes the Telegram details) |
| PUT | `/api/settings` | owner | Change store settings and the receipt printer |
| GET | `/api/reports/end-of-day?date=&cashier=` | logged in (cashiers: their own) | End-of-day totals |
| GET | `/api/reports/dashboard`, `daily-sales`, `weekly-sales`, `cashiers`, `best-sellers`, `stock-levels` | owner, manager | Today page and reports |
| GET | `/api/telegram/status` | owner | Telegram set up? Alerts sent, waiting and failed |
| PUT / DELETE | `/api/telegram/config` | owner | Save or remove the bot token and chat id |
| POST | `/api/telegram/test`, `/api/telegram/retry` | owner | Send a test message, retry failed alerts |
| GET | `/api/telegram/chats` | owner | Chats the bot has seen (to find the chat id) |
| GET / POST | `/api/backups` | owner | List backups, back up now |
| PUT | `/api/backups/settings` | owner | Backup folder, automatic backups on/off |
| POST | `/api/backups/restore` | owner | Restore a backup (body must include `confirm: "RESTORE"`) |

## Common problems

- **"Universe POS could not start" / "Could not connect to MongoDB"**: MongoDB is not
  running. Wait a minute after switching the laptop on, then **Try again**. Otherwise open
  `services.msc`, right-click **MongoDB Server** → **Start**. If it is not in the list,
  install MongoDB (Step 1).
- **"querySrv ECONNREFUSED" (or ETIMEOUT) with MongoDB Atlas** (development): your
  router or network refused the special DNS lookup that `mongodb+srv://` addresses need. The
  server tries again by itself through public DNS (1.1.1.1 and 8.8.8.8). If it still fails:
  1. In Atlas, **Network Access** → **Add IP Address** → **Add Current IP Address**.
  2. Change your computer's DNS to `1.1.1.1` and `8.8.8.8` (Windows: Control Panel →
     Network and Sharing Center → your connection → Properties → Internet Protocol
     Version 4 → "Use the following DNS server addresses").
  3. Or use Atlas's older-style address, which needs no special lookup: in Atlas click
     **Connect → Drivers**, choose **Node.js version 2.2.12 or later**, and copy the
     `mongodb://...:27017,...` address into `MONGO_URI`.
- **Receipts do not print**: check the printer is on and has paper, and that Settings →
  **Receipt printer** shows the right printer (it says *(not found)* if Windows cannot see it).
  Install the printer's Windows driver from its CD or the maker's website first.
- **The receipt is too long, too short or cut off**: check the **paper size** in Settings
  matches the printer (58mm or 80mm). In the printer's Windows settings
  (*Devices and Printers* → right-click → *Printing preferences*), choose the matching roll width.
- **Backup failed: "Cannot save backups in E:\..."**: the USB drive is not plugged in, or it
  now has a different letter. Plug it in, or choose the folder again on the Backup page.
- **The scanner beeps but nothing is added**: look at the line under the barcode box. If it
  says **Scanner paused**, click inside the app window or press **Esc**. Check the scanner
  sends "Enter" after each code (see "The barcode scanner").
- **"Product not found" for a product you have**: the product was saved without that
  barcode. Open it on the Products page and scan the barcode into it.
- **Telegram: "Unauthorized"**: the bot token is wrong. Copy it again from @BotFather
  (`/mybots` → your bot → API Token) and save it in Settings.
- **Telegram: "chat not found"**: the bot is not in the group, or the chat id is wrong. Use
  **Find my chat id** again. Group ids start with `-100`.
- **Forgot the owner password**: another owner can reset it on the Staff page. If there is no
  other owner, restore a backup from when you knew the password, or ask a developer to reset it.
- **Something else**: press **Ctrl + Shift + D**, open the `logs` folder, and send
  `universe-pos.log` to whoever looks after the app.
