# Universe Retail POS

A web-based point-of-sale and retail management system for a Nigerian supermarket / beauty store.

- **Frontend:** React (built with Vite), in `/client`
- **Backend:** Node.js + Express, in `/server`
- **Database:** MongoDB (models in `/server/models`, API routes in `/server/routes`)

## Build progress

| Stage | What it adds | Status |
|------:|--------------|--------|
| 1 | Project setup, login and roles | ✅ Done |
| 2 | Products, categories and inventory | ⏳ Next |
| 3 | Checkout screen, barcode scanning and payments | |
| 4 | Receipts and printing, hold/recall, returns, discounts | |
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

Add the sample staff accounts:

```bash
npm run seed
```

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

### 4. Log in with a sample account

| Role    | Username  | Password     | What they can do |
|---------|-----------|--------------|------------------|
| Owner   | `owner`   | `owner123`   | Everything, including staff accounts |
| Manager | `manager` | `manager123` | Checkout, back office (inventory and reports in later stages) |
| Cashier | `cashier` | `cashier123` | Checkout only |

**Change these passwords** (Back Office → Staff Accounts → Reset password)
before using the system in a real shop.

### 5. Things to try in Stage 1

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
    /components         TopBar, side menu, page protection, loading spinner
    /pages              one file per screen (Login, Checkout, Dashboard, Staff)
    /utils              small helpers (Naira formatting, role checks)
    config.js           store name and logo
/server                 Express API
  /config/db.js         connects to MongoDB
  /middleware/auth.js   checks the login token and the user's role
  /models               MongoDB data shapes (User)
  /routes               API endpoints (auth, users)
  seed.js               adds sample data
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

## Common problems

- **"Could not connect to MongoDB"**: MongoDB is not running, or `MONGO_URI` in
  `server/.env` is wrong. On Windows, open *Services* and start "MongoDB Server".
- **"Cannot reach the server"** on the login page: the backend terminal is
  not running. Start it with `npm run dev` inside `/server`.
- **Port already in use**: another program is using port 5000 or 5173. Close it,
  or change `PORT` in `server/.env` (and the proxy address in `client/vite.config.js`).
