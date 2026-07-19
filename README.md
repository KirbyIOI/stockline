# Stockline — Sales Forecasting & Inventory Management

A full-stack app for tracking inventory, recording sales, forecasting demand, and managing
reorder alerts. Prices and sample products are set up for a Tanzanian shop or wholesaler, and
both the currency and company name are configurable from Settings.

```
stockline/
├─ server/     Express API + SQLite database (the backend)
└─ client/     React + Vite frontend
```

**New here?** Start with **[RUNNING.md](./RUNNING.md)** for a step-by-step guide to getting this
running on your computer, written for non-technical readers. Ready to put it online?
See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for free-hosting instructions (Render, Netlify, Vercel).

## What's inside

**Forecasting** — three selectable models (`server/src/forecast.js`), switched from Settings
without touching code:
- **Linear trend** — ordinary least-squares regression over the whole sales history. Stable,
  simple, the right default for short or noisy histories.
- **Smoothed (Holt's method)** — double exponential smoothing, weighted toward recent weeks, so
  it reacts faster to a real change in sell-through. Best with 6+ weeks of history.
- **Seasonal (Holt-Winters)** — adds a repeating cycle (e.g. a monthly pattern) on top of the
  trend. Needs at least two full cycles of history, or it automatically falls back to Smoothed —
  the UI is always honest about which method actually produced a given number.

Whichever method is active feeds:
- **Reorder point** = average daily sales × supplier lead time + safety stock
- **Days of stock remaining** = current stock ÷ average daily sales
- **Suggested order quantity** = forecasted 6-week demand + safety stock − current stock

**Inventory management** — products, stock levels, recording sales, purchase orders (place,
receive, cancel), an alerts view with filtering/sorting/search and bulk purchase-order
generation, and CSV export from the Inventory and Alerts pages.

**Accounts & permissions** — real per-person accounts, not one shared password. Two roles:
- **Admin** — everything, plus Settings (business details, forecasting method) and Team
  (add/remove people, reset passwords, promote/demote)
- **Staff** — full inventory, orders, and forecasting access, but can't change company settings
  or manage other accounts

The very first admin account is created automatically on first run from `ADMIN_USERNAME`/
`ADMIN_PASSWORD` in `server/.env` — after that, accounts are managed entirely from the
Settings → Team page in the app, and those env vars are no longer consulted. See
[RUNNING.md](./RUNNING.md) for the first-run walkthrough.

**Settings page** — company name and currency symbol (shown throughout the app, including AI
assistant answers), forecasting method, team management (admin), and a "change my password"
form (everyone).

**AI assistant ("Ask Stockline")** — an optional chat widget, powered by the Claude API, that can
answer questions like *"what should I reorder this week?"* or *"which products are trending
down?"* using your actual, live product and order data — including your configured currency,
company name, and forecasting method — as context. It's off by default and the rest of the app
works normally without it — see [RUNNING.md](./RUNNING.md#step-7--turn-on-the-ai-assistant-optional)
to turn it on.

## Requirements

- [Node.js](https://nodejs.org) **22.5 or newer**
- npm (comes with Node)

No separate database server, and no C++ build tools, are required — the backend uses Node's
**built-in `node:sqlite` module** (not the `better-sqlite3` npm package), so there's nothing to
compile. Data is stored as a single file on disk (`server/data/inventory.db`), created
automatically on first run.

> **Why this matters:** an earlier version of this project used `better-sqlite3`, which needs to
> compile native C++ code against your exact Node version. On very new or non-LTS Node releases
> (particularly on Windows) that compile step can fail with V8 API errors. Using `node:sqlite`
> avoids that entirely. If you see a warning like `SQLite is an experimental feature`, that's
> expected and harmless — it still works correctly.

## Quick start

Full plain-English instructions are in **[RUNNING.md](./RUNNING.md)**. The short version, for
anyone already comfortable with a terminal:

```bash
# Backend
cd server
npm install
cp .env.example .env      # then edit .env: set ADMIN_USERNAME/PASSWORD and JWT_SECRET
npm run dev                # http://localhost:4000

# Frontend, in a second terminal
cd client
npm install
npm run dev                # http://localhost:5173
```

The first time the backend starts, it seeds the database with 6 sample products (Tanzanian
retail goods) and 14 weeks of sales history each, and creates your first admin account from
`ADMIN_USERNAME`/`ADMIN_PASSWORD`. To wipe and reseed the product data later:

```bash
npm run seed -- --force
```
(This resets products/sales/orders only — it does not touch accounts or settings.)

The Vite dev server proxies `/api/*` requests to `http://localhost:4000`, so just open
`http://localhost:5173` once both are running and log in with the credentials from your `.env`.

### API endpoints

All endpoints below except `/api/health`, `/api/auth/login`, and `/api/assistant/status` require
an `Authorization: Bearer <token>` header, obtained by logging in. Endpoints under `/api/users`,
and `PUT /api/settings`, additionally require an admin account.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Current user's `{ id, username, role }` |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` — any signed-in user |
| GET | `/api/products` | List all products with computed forecasting/inventory metrics |
| GET | `/api/products/:id` | Single product, full weekly sales history, metrics |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| POST | `/api/products/:id/sales` | Record units sold this week `{ units }` |
| GET | `/api/orders?status=open` | List purchase orders |
| POST | `/api/orders` | Place a purchase order `{ productId, qty }` |
| PATCH | `/api/orders/:id/receive` | Receive a shipment `{ units }`, adds to stock |
| PATCH | `/api/orders/:id/cancel` | Cancel an open order |
| GET | `/api/dashboard/summary` | Aggregate KPIs (revenue, inventory value, alert counts) |
| GET | `/api/settings` | Company name, currency, forecasting method (any signed-in user) |
| PUT | `/api/settings` | Update settings — **admin only** |
| GET | `/api/users` | List team accounts — **admin only** |
| POST | `/api/users` | Create a team account `{ username, password, role }` — **admin only** |
| PATCH | `/api/users/:id/role` | Change a user's role `{ role }` — **admin only** |
| PATCH | `/api/users/:id/password` | Reset a user's password `{ password }` — **admin only** |
| DELETE | `/api/users/:id` | Remove a team account — **admin only** |
| GET | `/api/assistant/status` | `{ enabled, model }` — whether the AI assistant is configured |
| POST | `/api/assistant/chat` | `{ message, history }` → `{ reply }`, requires `ANTHROPIC_API_KEY` |

## Production build

```bash
cd client
npm run build        # outputs static files to client/dist
```

If `client/dist` exists when the backend starts, `server/src/index.js` automatically serves it —
so running `npm start` in `server` after building the client gives you the whole app from one
process on one port. This is the simplest way to deploy (see DEPLOYMENT.md, Option A/B).

To deploy the frontend and backend as separate services instead (e.g. Netlify/Vercel + Render),
set `VITE_API_BASE_URL` to your backend's full URL at build time, and set `CLIENT_ORIGIN` on the
backend to your frontend's URL so CORS allows it. Full walkthrough in **DEPLOYMENT.md**.

## Troubleshooting

- **`SQLite is an experimental feature` warning** — harmless, ignore it. `node:sqlite` works
  correctly while carrying this label.
- **`node:sqlite` not found / import error** — your Node version predates 22.5. Update Node
  (check with `node -v`) rather than trying to reinstall packages.
- **Port already in use** — something else on your machine is using port 4000 or 5173. Change
  `PORT` in `server/.env` (copied from `.env.example`), or stop the other process.
- **"Sign in required" / stuck on login** — double check `ADMIN_USERNAME`/`ADMIN_PASSWORD` in
  `server/.env` match what you're typing (only used for the very first account — see below), and
  that the backend terminal is still running.
- **Locked out after changing `ADMIN_USERNAME`/`ADMIN_PASSWORD`** — those env vars only matter
  the *first* time the app ever starts, to create the initial admin. Changing them later doesn't
  change any existing account's password. To reset a forgotten password, stop the server, delete
  `server/data/inventory.db*`, and restart — this wipes all data (products, sales, accounts) and
  recreates the first admin from `.env`. There's no undo, so only do this if starting over is
  genuinely fine.
- **"There must be at least one admin"** — Stockline won't let you demote or delete the last
  admin account, so there's always a way to manage the app. Promote a second account to admin
  first if you need to remove or demote the original one.

More troubleshooting, written for non-technical readers, is in **RUNNING.md**.

## Notes on extending this

- **Bigger database**: SQLite is genuinely fine for a single store or small team. If you need
  concurrent writers across many locations, swapping the `node:sqlite` calls in `db.js` for `pg`
  (Postgres) is a contained change — the SQL and route logic carry over directly, you'd just
  need to adjust to Postgres syntax and an async driver (routes currently assume synchronous
  calls).
- **More granular permissions**: today it's a simple admin/staff split. If you need, say, a
  role that can record sales but not delete products, `server/src/auth.js`'s `requireAdmin`
  pattern is a template — add a similar `requireRole(...)` middleware and apply it per-route.
- **AI assistant scope**: `server/src/routes/assistant.js` currently answers read-only questions
  about existing data. It's deliberately not wired up to place orders or edit products on its
  own — if you want to extend it to take actions, treat that as a security-sensitive change and
  add explicit confirmation steps before anything the model suggests actually writes to the
  database.
- **Per-product forecasting method**: the forecasting method is currently a single, app-wide
  setting (`settings.forecastMethod`) rather than configurable per product. If some products are
  genuinely seasonal and others aren't, `productMetrics()` in `forecast.js` already accepts a
  per-call `options.method` — the change would be storing a method on each product row instead
  of only in `settings`, and falling back to the app-wide default when unset.
