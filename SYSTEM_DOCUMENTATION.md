# Stockline — Sales Forecasting & Inventory Management System

## Full System Documentation

---

## 1. Executive Summary

Stockline is a full-stack web application designed for small-to-medium retail businesses (with a focus on Tanzanian/East African shops and wholesalers) to manage inventory, record sales, forecast demand, and automate purchase order recommendations. It provides per-person accounts, role-based access control, configurable business settings, CSV export, and an optional AI-powered assistant.

The system runs entirely on Node.js (no external database server or compilation tools), making it deployable on anything from a laptop to a free cloud host.

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (React + Vite SPA)                      │
│  Port 5173 (dev)                                                 │
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐│
│  │ Dashboard  │  │  Inventory   │  │  Forecast  │  │  Alerts   ││
│  └───────────┘  └──────────────┘  └────────────┘  └───────────┘│
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐│
│  │ Settings   │  │ SalesHistory │  │OrderHistory│  │  AI Assist││
│  └───────────┘  └──────────────┘  └────────────┘  └───────────┘│
│                                                                   │
│  API Client (api.js) — JWT auth via localStorage                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (REST JSON over /api/*)
                         │ Proxy in dev (Vite); same-origin in prod
┌────────────────────────▼────────────────────────────────────────┐
│                  Server (Express + SQLite)                         │
│  Port 4000 (dev)                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Routes/auth  │  │ Routes/      │  │ Forecasting Engine       │ │
│  │ Routes/users │  │ products     │  │ - linearForecast()       │ │
│  │ Routes/      │  │ Routes/      │  │ - smoothedForecast()     │ │
│  │   settings  │  │   orders     │  │ - seasonalForecast()     │ │
│  │ Routes/      │  │ Routes/      │  │ - mlForecast() (NN)      │ │
│  │   dashboard │  │   assistant  │  └─────────────────────────┘ │
│  └──────┬──────┘  └──────┬───────┘  ┌─────────────────────────┐ │
│         │                │          │    Database Layer        │ │
│         └────────────────┴──────────┤ - db.js (SQLite via      │ │
│                                     │   node:sqlite)           │ │
│                                     │ - Schema: products,      │ │
│                                     │   weekly_sales, orders,  │ │
│                                     │   users, settings        │ │
│                                     └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | ^18.3.1 |
| Build Tool | Vite | ^5.4.1 |
| Frontend Charts | Recharts | ^2.12.7 |
| Frontend Icons | Lucide React | ^0.383.0 |
| Backend Runtime | Node.js | >= 22.5.0 |
| Backend Framework | Express | ^4.19.2 |
| Database | SQLite (built-in `node:sqlite`) | Built into Node 22.5+ |
| Authentication | JWT (`jsonwebtoken`) | ^9.0.2 |
| Password Hashing | bcryptjs | ^2.4.3 |
| Security Headers | helmet | ^7.1.0 |
| CORS | cors | ^2.8.5 |
| Rate Limiting | express-rate-limit | ^7.4.1 |
| Environment Variables | dotenv | ^16.4.5 |
| AI Assistant | @anthropic-ai/sdk | latest (optional) |

### 2.3 Directory Structure

```
stockline/
├── .gitignore
├── README.md                         # Project overview & API docs
├── RUNNING.md                        # Local setup (non-technical)
├── DEPLOYMENT.md                     # Hosting instructions
├── SYSTEM_DOCUMENTATION.md           # THIS FILE
│
├── client/                           # React frontend
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js                # Vite config + API proxy
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # Root component (routing, state)
│       ├── api.js                    # REST client + JWT management
│       ├── styles.js                 # Design tokens, colors, helpers
│       ├── csv.js                    # CSV download utility
│       └── components/
│           ├── ErrorBoundary.jsx     # Global error boundary
│           ├── Login.jsx             # Login form
│           ├── Dashboard.jsx         # KPI dashboard
│           ├── Inventory.jsx         # Product table + CRUD
│           ├── Forecast.jsx          # Product detail + forecast chart
│           ├── Alerts.jsx            # Reorder alerts + bulk actions
│           ├── Settings.jsx          # Admin settings, team mgmt
│           ├── Modals.jsx            # Product/Sale/Receive modals
│           ├── Shared.jsx            # Shared UI components
│           ├── SalesHistory.jsx      # Sales recording view
│           ├── OrderHistory.jsx      # Purchase order tracking
│           └── AIAssistant.jsx       # Chat widget
│
└── server/                           # Express backend
    ├── package.json
    ├── package-lock.json
    ├── .env.example                  # Template for environment config
    ├── data/                         # SQLite database location (auto-created)
    └── src/
        ├── index.js                  # Server entry point, middleware, routing
        ├── db.js                     # Database init, schema, helpers
        ├── auth.js                   # JWT signing/verification, auth guards
        ├── users.js                  # User CRUD operations
        ├── settings.js              # Settings read/write (singleton row)
        ├── forecast.js              # Forecasting models + metrics engine
        ├── mlForecast.js            # Pure-JS neural network (brain.js replacement)
        ├── format.js                # Currency formatting utility
        ├── seed.js                  # Sample data seeder
        └── routes/
            ├── auth.js              # Login, me, change-password
            ├── products.js          # Product CRUD + sales recording
            ├── orders.js            # Purchase order lifecycle
            ├── dashboard.js         # Dashboard summary aggregation
            ├── settings.js          # Settings GET/PUT
            ├── users.js             # User management (admin only)
            └── assistant.js         # AI assistant chat + status
```

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization (FR-1)

| ID | Requirement | Status |
|----|------------|--------|
| FR-1.1 | System shall support per-person user accounts (username + password) | ✅ Implemented |
| FR-1.2 | Passwords shall be hashed with bcrypt (cost factor 10) | ✅ Implemented |
| FR-1.3 | Login sessions shall use signed JWT tokens (12-hour expiry) | ✅ Implemented |
| FR-1.4 | System shall support two roles: admin and staff | ✅ Implemented |
| FR-1.5 | Admin role shall have access to Settings and Team management | ✅ Implemented |
| FR-1.6 | Staff role shall have full inventory/order/forecast access, but no settings/team | ✅ Implemented |
| FR-1.7 | First admin account shall be auto-created from .env on first run | ✅ Implemented |
| FR-1.8 | System shall prevent deleting/demoting the last admin account | ✅ Implemented |
| FR-1.9 | Password changes shall require current password verification | ✅ Implemented |
| FR-1.10 | Login rate limiting: max 20 attempts per 15-minute window | ✅ Implemented |
| FR-1.11 | Username enumeration protection via dummy bcrypt hashing | ✅ Implemented |

### 3.2 Product & Inventory Management (FR-2)

| ID | Requirement | Status |
|----|------------|--------|
| FR-2.1 | System shall allow creating products with name, SKU, category, stock, cost, price | ✅ Implemented |
| FR-2.2 | SKU shall be unique across all products | ✅ Implemented |
| FR-2.3 | System shall allow editing all product fields | ✅ Implemented |
| FR-2.4 | System shall allow deleting products (cascading to sales/orders) | ✅ Implemented |
| FR-2.5 | Product list shall be searchable by name, SKU, and category | ✅ Implemented |
| FR-2.6 | Product list shall display computed metrics (status, reorder point, etc.) | ✅ Implemented |
| FR-2.7 | System shall support CSV export of inventory data | ✅ Implemented |

### 3.3 Sales Recording (FR-3)

| ID | Requirement | Status |
|----|------------|--------|
| FR-3.1 | System shall allow recording units sold for any product | ✅ Implemented |
| FR-3.2 | Recording a sale shall decrement product stock | ✅ Implemented |
| FR-3.3 | Recording a sale shall add a weekly sales data point | ✅ Implemented |
| FR-3.4 | Stock shall not go below 0 (MAX(0, stock - units)) | ✅ Implemented |

### 3.4 Sales History (FR-4)

| ID | Requirement | Status |
|----|------------|--------|
| FR-4.1 | System shall display a sales history view with product selector | ✅ Implemented |
| FR-4.2 | Sales history shall show weekly units sold over time | ✅ Implemented |
| FR-4.3 | Sales history shall be visualized as a bar chart (Recharts) | ✅ Implemented |

### 3.5 Forecasting (FR-5)

| ID | Requirement | Status |
|----|------------|--------|
| FR-5.1 | System shall provide linear regression forecasting | ✅ Implemented |
| FR-5.2 | System shall provide Holt's exponential smoothing forecasting | ✅ Implemented |
| FR-5.3 | System shall provide Holt-Winters seasonal forecasting | ✅ Implemented |
| FR-5.4 | System shall provide neural network (ML) forecasting | ✅ Implemented |
| FR-5.5 | Forecast horizon shall be 6 weeks | ✅ Implemented |
| FR-5.6 | Each forecast shall include value, low, and high bounds (RMSE-based) | ✅ Implemented |
| FR-5.7 | Forecast shall be shown as a chart with historical data overlay | ✅ Implemented |
| FR-5.8 | Reorder point shall be computed as avgDailySales × leadTime + safetyStock | ✅ Implemented |
| FR-5.9 | Days of stock remaining shall be computed as stock ÷ avgDailySales | ✅ Implemented |
| FR-5.10 | Suggested order qty shall be computed as (forecasted 6wk demand + safetyStock - stock) | ✅ Implemented |
| FR-5.11 | Product status shall be one of: ok, reorder, critical, out | ✅ Implemented |
| FR-5.12 | Seasonal forecasting shall fallback to smoothed if < 2 full cycles of history | ✅ Implemented |
| FR-5.13 | ML forecasting shall fallback to linear if < 5 weeks of history | ✅ Implemented |
| FR-5.14 | Forecasting method shall be configurable globally via Settings | ✅ Implemented |

### 3.6 Purchase Orders (FR-6)

| ID | Requirement | Status |
|----|------------|--------|
| FR-6.1 | System shall allow creating purchase orders (productId, qty) | ✅ Implemented |
| FR-6.2 | Orders shall have status: open, received, cancelled | ✅ Implemented |
| FR-6.3 | System shall allow receiving shipments (partial or full) | ✅ Implemented |
| FR-6.4 | Receiving a shipment shall increase product stock | ✅ Implemented |
| FR-6.5 | System shall allow cancelling open orders | ✅ Implemented |
| FR-6.6 | Orders list shall be filterable by status | ✅ Implemented |
| FR-6.7 | Order history view shall show all orders with product names | ✅ Implemented |
| FR-6.8 | Orders shall be displayed newest-first | ✅ Implemented |

### 3.7 Alerts (FR-7)

| ID | Requirement | Status |
|----|------------|--------|
| FR-7.1 | System shall show products needing attention (not "ok" status) | ✅ Implemented |
| FR-7.2 | Alerts shall be sortable by status, stock, or name | ✅ Implemented |
| FR-7.3 | Alerts shall be filterable by status type | ✅ Implemented |
| FR-7.4 | Alerts shall be searchable | ✅ Implemented |
| FR-7.5 | System shall allow bulk generation of purchase orders from alerts | ✅ Implemented |
| FR-7.6 | Alerts shall show current open order status per product | ✅ Implemented |
| FR-7.7 | CSV export shall be supported on alerts page | ✅ Implemented |

### 3.8 Dashboard (FR-8)

| ID | Requirement | Status |
|----|------------|--------|
| FR-8.1 | Dashboard shall show total product count | ✅ Implemented |
| FR-8.2 | Dashboard shall show total inventory value (stock × unitCost) | ✅ Implemented |
| FR-8.3 | Dashboard shall show last 4 weeks revenue (units × price) | ✅ Implemented |
| FR-8.4 | Dashboard shall show revenue change vs previous 4 weeks | ✅ Implemented |
| FR-8.5 | Dashboard shall show count of products by status (ok/reorder/critical/out) | ✅ Implemented |
| FR-8.6 | Dashboard shall show total suggested reorder value | ✅ Implemented |
| FR-8.7 | Dashboard shall show open order count | ✅ Implemented |
| FR-8.8 | Dashboard shall show a list of products needing attention | ✅ Implemented |
| FR-8.9 | Clicking a product on dashboard shall navigate to its forecast detail | ✅ Implemented |

### 3.9 Settings (FR-9)

| ID | Requirement | Status |
|----|------------|--------|
| FR-9.1 | Company name shall be configurable | ✅ Implemented |
| FR-9.2 | Currency symbol shall be configurable | ✅ Implemented |
| FR-9.3 | Forecasting method shall be switchable (linear/smoothed/seasonal/ml) | ✅ Implemented |
| FR-9.4 | Season length shall be configurable (2-52 weeks) | ✅ Implemented |
| FR-9.5 | Team member management: add user | ✅ Implemented |
| FR-9.6 | Team member management: change user role | ✅ Implemented |
| FR-9.7 | Team member management: reset user password | ✅ Implemented |
| FR-9.8 | Team member management: delete user | ✅ Implemented |
| FR-9.9 | Password change form for current user | ✅ Implemented |
| FR-9.10 | Settings validation: method must be valid, seasonLength 2-52, currency max 10 chars | ✅ Implemented |

### 3.10 AI Assistant (FR-10, Optional)

| ID | Requirement | Status |
|----|------------|--------|
| FR-10.1 | System shall provide an optional AI chat widget (bottom-right) | ✅ Implemented |
| FR-10.2 | Chat widget shall be enabled only when ANTHROPIC_API_KEY is set | ✅ Implemented |
| FR-10.3 | AI shall answer questions about products, stock, reorder suggestions | ✅ Implemented |
| FR-10.4 | AI shall not be able to modify data (read-only) | ✅ Implemented |
| FR-10.5 | AI chat shall be rate-limited to 15 requests per minute | ✅ Implemented |
| FR-10.6 | Chat history shall be limited to last 10 turns | ✅ Implemented |
| FR-10.7 | System prompt includes current business context (all products, open orders, settings) | ✅ Implemented |

### 3.11 Data Seeding (FR-11)

| ID | Requirement | Status |
|----|------------|--------|
| FR-11.1 | System shall seed 6 sample products on first run | ✅ Implemented |
| FR-11.2 | Each sample product shall have 14 weeks of generated sales history | ✅ Implemented |
| FR-11.3 | Seed data shall include various categories (Grains, Oil, Textiles, Building, Electronics, Crafts) | ✅ Implemented |
| FR-11.4 | Seed shall be skippable if data already exists | ✅ Implemented |
| FR-11.5 | `npm run seed -- --force` shall allow re-seeding (wipes products/sales/orders) | ✅ Implemented |
| FR-11.6 | Re-seeding shall preserve user accounts and settings | ✅ Implemented |

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-1)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-1.1 | Forecast computation per product shall complete in < 50ms | ✅ Implemented | Math models are O(n); NN is O(iterations × inputSize × hiddenSize) |
| NFR-1.2 | Full product list (6 products seeded) API response in < 200ms | ✅ Implemented | All computation is synchronous SQLite |
| NFR-1.3 | Dashboard summary in < 100ms | ✅ Implemented | Single SQL aggregate pass |
| NFR-1.4 | ML model training per product < 500ms (1500 iterations typical) | ✅ Implemented | Pure JS matrix ops with small hidden layer (3-8 neurons) |
| NFR-1.5 | API rate limit: 300 requests/min (general), 20/15min (login), 15/min (AI) | ✅ Implemented |

### 4.2 Security (NFR-2)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-2.1 | Passwords shall be hashed with bcrypt (cost >= 10) | ✅ Implemented | `bcrypt.hashSync(password, 10)` |
| NFR-2.2 | JWT secret must be set in production | ✅ Implemented | Throws error if missing in production |
| NFR-2.3 | JWT tokens expire after 12 hours | ✅ Implemented | `TOKEN_TTL = "12h"` |
| NFR-2.4 | All API routes except login, health, and assistant/status require authentication | ✅ Implemented | `requireAuth` middleware |
| NFR-2.5 | Admin-only routes have additional authorization guard | ✅ Implemented | `requireAdmin` middleware |
| NFR-2.6 | Security headers via helmet (CSP disabled) | ✅ Implemented | `helmet({ contentSecurityPolicy: false })` |
| NFR-2.7 | CORS configurable via CLIENT_ORIGIN env var | ✅ Implemented | Defaults to `*` |
| NFR-2.8 | Brute-force protection via rate limiting on login | ✅ Implemented | 20 attempts per 15 min |
| NFR-2.9 | Username enumeration protection | ✅ Implemented | Dummy hash for nonexistent users |
| NFR-2.10 | Sessions invalidated on 401 (clear localStorage token) | ✅ Implemented | `setUnauthorizedHandler` in api.js |

### 4.3 Data Integrity (NFR-3)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-3.1 | Products/sales/orders mutations shall use SQLite transactions | ✅ Implemented | `withTransaction()` helper (BEGIN/COMMIT/ROLLBACK) |
| NFR-3.2 | Foreign key constraints shall be enforced | ✅ Implemented | `PRAGMA foreign_keys = ON` |
| NFR-3.3 | WAL journal mode for concurrent read performance | ✅ Implemented | `PRAGMA journal_mode = WAL` |
| NFR-3.4 | Stock shall never go negative | ✅ Implemented | `MAX(0, stock - units)` |
| NFR-3.5 | SKU uniqueness enforced at database level | ✅ Implemented | `UNIQUE` constraint on products.sku |

### 4.4 Availability & Reliability (NFR-4)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-4.1 | App shall start without any external service dependency | ✅ Implemented | SQLite is built into Node |
| NFR-4.2 | No C++ compilation required for any dependency | ✅ Implemented | All pure-JS packages |
| NFR-4.3 | App shall run on Node.js 22.5+ on Windows, Mac, Linux | ✅ Implemented | Cross-platform |
| NFR-4.4 | Error boundary at component level shall prevent full crash | ✅ Implemented | ErrorBoundary.jsx |
| NFR-4.5 | Server shall catch and log all unhandled errors | ✅ Implemented | Express error middleware |

### 4.5 Maintainability (NFR-5)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-5.1 | Forecasting models shall produce same output shape for interchangeability | ✅ Implemented | All return `{ forecast, rmse, slope }` |
| NFR-5.2 | Adding new forecasting method requires only adding function + updating method list | ✅ Implemented | Settings validation in settings.js |
| NFR-5.3 | Database layer is encapsulated in db.js | ✅ Implemented | Single module for all DB access |
| NFR-5.4 | API client is centralized in api.js | ✅ Implemented | Single module for all HTTP calls |
| NFR-5.5 | Design tokens are centralized in styles.js | ✅ Implemented | Colors, sizes, shared styles |

### 4.6 Portability (NFR-6)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-6.1 | Backend can serve built frontend from same process (single-service deployment) | ✅ Implemented | `if (fs.existsSync(clientDist))` |
| NFR-6.2 | Frontend and backend can be deployed separately | ✅ Implemented | `VITE_API_BASE_URL` env var |
| NFR-6.3 | Database path configurable via DB_PATH env var | ✅ Implemented | For persistent disk deployment |
| NFR-6.4 | Client origin configurable via CLIENT_ORIGIN env var | ✅ Implemented | CORS origin |

### 4.7 Accessibility (NFR-7)

| ID | Requirement | Status | Details |
|----|------------|--------|---------|
| NFR-7.1 | Focus-visible outlines on interactive elements | ✅ Implemented | `:focus-visible` CSS in App.jsx global style |
| NFR-7.2 | Disabled button styling | ✅ Implemented | `button:disabled { opacity: 0.5 }` |
| NFR-7.3 | Keyboard-navigable navigation and forms | ✅ Implemented | Standard HTML buttons/inputs |

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram (Textual)

```
users ──┬────────── products ────< weekly_sales
        │            │
        │            └───< orders
        │
 settings (singleton row, id=1)
```

### 5.2 Table Definitions

#### `products`
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | Product display name |
| sku | TEXT | NOT NULL, UNIQUE | Stock keeping unit identifier |
| category | TEXT | NOT NULL, DEFAULT '' | Product category |
| stock | INTEGER | NOT NULL, DEFAULT 0 | Current physical stock count |
| unit_cost | REAL | NOT NULL, DEFAULT 0 | Cost per unit in local currency |
| price | REAL | NOT NULL, DEFAULT 0 | Selling price per unit |
| lead_time_days | INTEGER | NOT NULL, DEFAULT 14 | Supplier lead time for reorder |
| safety_stock | INTEGER | NOT NULL, DEFAULT 0 | Buffer stock level |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | ISO 8601 timestamp |

#### `weekly_sales`
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated |
| product_id | TEXT | NOT NULL, REFERENCES products(id) ON DELETE CASCADE | FK to product |
| week_index | INTEGER | NOT NULL | Sequential week number for product |
| units | INTEGER | NOT NULL | Units sold that week |
| recorded_at | TEXT | NOT NULL, DEFAULT datetime('now') | When recorded |

Index: `idx_weekly_sales_product(product_id, week_index)`

#### `orders`
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| product_id | TEXT | NOT NULL, REFERENCES products(id) ON DELETE CASCADE | FK to product |
| qty | INTEGER | NOT NULL | Quantity ordered |
| status | TEXT | NOT NULL, DEFAULT 'open' | One of: open, received, cancelled |
| placed_at | TEXT | NOT NULL, DEFAULT datetime('now') | When order was placed |
| received_at | TEXT | | When order was received (nullable) |

Index: `idx_orders_product(product_id, status)`

#### `users`
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| username | TEXT | NOT NULL, UNIQUE | Login username |
| password_hash | TEXT | NOT NULL | bcrypt hash |
| role | TEXT | NOT NULL, DEFAULT 'staff' | One of: admin, staff |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | ISO 8601 timestamp |

#### `settings` (Singleton — id always = 1)
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY, CHECK (id = 1) | Always 1 |
| company_name | TEXT | NOT NULL, DEFAULT '' | Business display name |
| currency_symbol | TEXT | NOT NULL, DEFAULT 'TSh' | Currency display (e.g., TSh, $, KSh) |
| forecast_method | TEXT | NOT NULL, DEFAULT 'linear' | One of: linear, smoothed, seasonal, ml |
| season_length | INTEGER | NOT NULL, DEFAULT 4 | Weeks per seasonal cycle |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | Last update timestamp |

### 5.3 Transactions

The `withTransaction()` helper in `db.js` wraps operations in:
```
BEGIN → (statements) → COMMIT (or ROLLBACK on error)
```

Operations requiring transactions:
- Recording a sale (INSERT weekly_sales + UPDATE products.stock)
- Receiving an order (INSERT orders.status update + UPDATE products.stock)
- Seeding data (bulk insert products + sales)

---

## 6. API Reference

### 6.1 Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | `{ username, password }` → `{ token, user }`; rate-limited 20/15min |
| GET | `/api/auth/me` | Yes | Returns `{ id, username, role }` |
| POST | `/api/auth/change-password` | Yes | `{ currentPassword, newPassword }` — requires min 8 chars |

### 6.2 Product Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | Yes | Full product list with computed metrics |
| GET | `/api/products/:id` | Yes | Single product + weekly history + metrics |
| POST | `/api/products` | Yes | Create product; seeds 4-week baseline sales history |
| PUT | `/api/products/:id` | Yes | Update product fields |
| DELETE | `/api/products/:id` | Yes | Delete product (cascade to sales/orders) |
| POST | `/api/products/:id/sales` | Yes | `{ units }` — record sale, decrement stock, advance week index |

### 6.3 Order Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders?status=open` | Yes | Filtered order list (default: all) |
| POST | `/api/orders` | Yes | `{ productId, qty }` — place order |
| PATCH | `/api/orders/:id/cancel` | Yes | Cancel open order |
| PATCH | `/api/orders/:id/receive` | Yes | `{ units }` — receive shipment (partially supported) |

### 6.4 Dashboard Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/summary` | Yes | Aggregate KPIs (revenue, value, counts, etc.) |

### 6.5 Settings Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | Yes | Current settings (any authenticated user) |
| PUT | `/api/settings` | Admin | Update settings (validated, auto-trains ML if method switched to "ml") |

### 6.6 User Management Endpoints (Admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | `{ username, password, role }` — create user |
| PATCH | `/api/users/:id/role` | Admin | `{ role }` — change role (prevents last admin demotion) |
| PATCH | `/api/users/:id/password` | Admin | `{ password }` — reset password |
| DELETE | `/api/users/:id` | Admin | Delete user (prevents self-delete and last admin delete) |

### 6.7 AI Assistant Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/assistant/status` | No | `{ enabled, model }` — is AI configured? |
| POST | `/api/assistant/chat` | Yes | `{ message, history }` → `{ reply }`; rate-limited 15/min |

### 6.8 Health Check

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | `{ ok: true }` |

---

## 7. Forecasting Engine Details

### 7.1 Linear Regression (`linearForecast`)

- **Method:** Ordinary Least Squares (OLS) over all historical data points
- **Formula:** `y = mx + b` where m = slope, b = intercept
- **Strengths:** Simple, stable, good default for short/noisy histories
- **Weaknesses:** Slow to react to recent changes; assumes constant trend
- **Complexity:** O(n) with n = number of weeks

### 7.2 Holt's Exponential Smoothing (`smoothedForecast`)

- **Method:** Double exponential smoothing with level (α=0.4) and trend (β=0.3) components
- **Formula:**
  - `level = α × actual + (1-α) × (level + trend)`
  - `trend = β × (level_new - level_old) + (1-β) × trend`
- **Strengths:** Reacts faster to recent changes; good with 6+ weeks of history
- **Weaknesses:** Single trend component may miss seasonal patterns
- **Complexity:** O(n)

### 7.3 Holt-Winters Seasonal (`seasonalForecast`)

- **Method:** Triple exponential smoothing with additive seasonality
- **Parameters:** α=0.3 (level), β=0.2 (trend), γ=0.3 (seasonal)
- **Season Length:** Configurable (default: 4 weeks)
- **Fallback:** If fewer than 2 × seasonLength weeks available, falls back to `smoothedForecast`
- **Strengths:** Captures repeating patterns (e.g., monthly cycles)
- **Complexity:** O(n × seasonLength)

### 7.4 Neural Network (`mlForecast`)

- **Architecture:** Feedforward with one hidden layer
- **Inputs:** Sliding window of last N weeks (lookBack = 4)
- **Hidden Layer:** 3-8 neurons (adaptive: min(8, max(3, data.length/2)))
- **Activation:** Sigmoid
- **Training:** Backpropagation with stochastic gradient descent
- **Learning Rate:** 0.02
- **Iterations:** min(1500, max(300, data.length × 80))
- **Normalization:** Input/output values normalized by dividing by max value
- **Fallback:** If < 5 weeks of history, falls back to linear
- **Persistence:** Models serialized to JSON and saved to `data/ml_models.json`

### 7.5 Unified Output Shape

All forecast functions return:
```javascript
{
  forecast: [
    { value: number, low: number, high: number },  // 6 weeks
    // ...
  ],
  rmse: number,   // Root mean squared error
  slope: number,  // Overall trend direction
}
```

### 7.6 Inventory Metrics (computed in `productMetrics`)

| Metric | Formula |
|--------|---------|
| avgWeekly | `sum(recent 4 weeks) / 4` |
| avgDaily | `avgWeekly / 7` |
| reorderPoint | `round(avgDaily × leadTimeDays + safetyStock)` |
| daysOfStock | `stock / avgDaily` (Infinity if avgDaily = 0) |
| demandNext6 | `sum(forecast[0..5].value)` |
| suggestedOrder | `max(0, demandNext6 + safetyStock - stock)` |
| status | `out` (stock ≤ 0), `critical` (daysOfStock ≤ leadTime), `reorder` (stock ≤ reorderPoint), else `ok` |

---

## 8. Frontend Component Details

### 8.1 Application State (App.jsx)

Centralized state management via React hooks (no Redux):
- `authed` (boolean) — login status
- `me` (object) — current user `{ id, username, role }`
- `appSettings` (object) — company name, currency, forecast method
- `products` (array) — all products with computed metrics
- `summary` (object) — dashboard KPI aggregates
- `orders` (object) — open orders mapped by productId
- `view` (string) — current navigation view
- `selectedId` (string) — currently selected product for forecast detail

### 8.2 Navigation

| View | Component | Description |
|------|-----------|-------------|
| dashboard | Dashboard.jsx | KPI summary + attention-needed list |
| inventory | Inventory.jsx | Product table with search + CRUD actions |
| forecast | Forecast.jsx | Single product detail with forecast chart |
| sales-history | SalesHistory.jsx | Weekly sales bar chart per product |
| order-history | OrderHistory.jsx | All purchase orders table |
| alerts | Alerts.jsx | Filterable/sortable products needing action |
| settings | Settings.jsx | Business settings + team management |

### 8.3 Mobile Responsiveness

- Breakpoint: 860px
- Collapsible navigation (hamburger menu)
- Sticky top bar on mobile
- Full-width content on mobile

### 8.4 Design System (styles.js)

- **Fonts:** Space Grotesk (headings), Inter (body), IBM Plex Mono (data)
- **Colors:**
  - Primary: `#4338CA` (indigo)
  - Background: `#F3F5F9`
  - Panel: `#FFFFFF`
  - Ink: `#101828`
  - Sub: `#5B6472`
  - Line: `#E3E7EE`
  - Teal: `#0D9488` (healthy/ok)
  - Amber: `#B45309` (reorder)
  - Rose: `#BE123C` (critical/out)

---

## 9. Deployment Options

### 9.1 Local Development

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env    # Edit ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET
npm install
npm run dev             # http://localhost:4000

# Terminal 2 — Frontend
cd client
npm install
npm run dev             # http://localhost:5173
```

### 9.2 Production Build (Single Service)

```bash
cd client
npm run build           # Outputs to client/dist/
# Then start server:
cd ../server
npm start               # Serves client/dist automatically
```

### 9.3 Render Deployment (Free Tier — Option A)

- **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
- **Start Command:** `cd server && npm start`
- **Environment Variables:** ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, (optional) ANTHROPIC_API_KEY
- **Note:** Database resets on restart (free tier limitation)

### 9.4 Render Deployment (Persistent — Option B)

Same as Option A, but:
- Instance Type: Starter (~$7/month)
- Persistent Disk: Mount at `/opt/render/project/src/server/data`, 1GB
- `DB_PATH=/opt/render/project/src/server/data/inventory.db`

### 9.5 Split Deployment (Option C)

- Frontend: Netlify/Vercel — build `client/`, set `VITE_API_BASE_URL`
- Backend: Render — host API, set `CLIENT_ORIGIN` to frontend URL

---

## 10. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_USERNAME` | For first run | `admin` | First admin account username |
| `ADMIN_PASSWORD` | For first run | `stockline123` | First admin account password |
| `JWT_SECRET` | Yes (production) | `dev-only-insecure-secret-change-me` | JWT signing key |
| `CLIENT_ORIGIN` | No | `*` | CORS allowed origin (separate hosting) |
| `CLIENT_DIST_PATH` | No | `../client/dist` | Path to built frontend |
| `DB_PATH` | No | `./data/inventory.db` | SQLite database file path |
| `PORT` | No | `4000` | Server listening port |
| `ANTHROPIC_API_KEY` | No | — | Enable AI assistant feature |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-5` | Claude model for AI |
| `ML_MODELS_PATH` | No | `server/data/ml_models.json` | Serialized ML model storage |

---

## 11. Build & Run Commands

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | server | Start backend with file watching |
| `npm run dev` | client | Start frontend dev server with proxy |
| `npm start` | server | Start backend in production mode |
| `npm run build` | client | Build frontend for production |
| `npm run seed -- --force` | server | Wipe products/sales/orders and reseed sample data |
| `npm run preview` | client | Preview built frontend |

---

## 12. Security Considerations

### 12.1 Authentication Flow
1. User submits username/password → POST `/api/auth/login`
2. Server verifies bcrypt hash → issues JWT (signed, 12h expiry)
3. Client stores JWT in `localStorage` (key: `stockline_token`)
4. All subsequent requests include `Authorization: Bearer <token>`
5. On 401 response → client clears token, shows login screen

### 12.2 Admin Protection
- `/api/users/*` router mounted with `requireAuth + requireAdmin`
- `/api/settings` PUT endpoint calls `requireAdmin` internally
- Frontend conditionally shows admin UI based on `me.role`
- Admin-only features: Settings page, Team management, business config

### 12.3 Rate Limiting
| Scope | Limit | Window |
|-------|-------|--------|
| General API (`/api/*`) | 300 requests | 60 seconds |
| Login (`/api/auth/login`) | 20 attempts | 15 minutes |
| AI Chat (`/api/assistant/chat`) | 15 requests | 60 seconds |

### 12.4 Password Policy
- Minimum length: 8 characters
- Hashed with bcrypt (cost factor 10)
- Change requires current password verification
- Admin can reset any user's password (no current password needed)
- No password complexity requirements beyond minimum length

### 12.5 Data Protection
- `.env` file is gitignored (never committed)
- SQLite database is gitignored (`server/data/`)
- `ANTHROPIC_API_KEY` must be set via environment variable in production (never in code)
- AI assistant sends product/order data to Anthropic's API when used

---

## 13. Performance Characteristics

| Operation | Typical Time | Notes |
|-----------|-------------|-------|
| Full product list (6 products) | ~10ms | Synchronous SQLite, all in-memory |
| Single product detail | ~5ms | Single product + metrics |
| Record sale | ~5ms | Transaction: INSERT + UPDATE |
| Dashboard summary | ~8ms | Aggregate across all products |
| Linear forecast (14 weeks) | <1ms | OLS regression |
| Smoothed forecast (14 weeks) | <1ms | Double exponential smoothing |
| ML train (14 weeks, 1000 iterations) | ~100ms | Pure-JS matrix operations |
| ML predict (1 product, 6 weeks) | <5ms | Feedforward pass |
| AI assistant response | 500ms-3s | Depends on Anthropic API latency |
| CSV export (alert or inventory) | <10ms | Client-side generation |

---

## 14. Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| `node:sqlite` not found | Node < 22.5 | Update Node.js to 22.5+ |
| `SQLite is an experimental feature` | Normal for node:sqlite | Ignore — works correctly |
| Port already in use | Another process on port | Change PORT in .env; stop other process |
| "Sign in required" after login | JWT expired (12h) | Re-login |
| Login fails repeatedly | Wrong credentials | Check .env ADMIN_USERNAME/PASSWORD; or delete server/data/ to reset |
| "There must be at least one admin" | Last admin being demoted/deleted | Promote another user to admin first |
| AI assistant not showing | ANTHROPIC_API_KEY not set | Add key to .env and restart server |
| Build fails with `cd: too many arguments` | Extra spaces in build command | Use exact: `cd client && npm install && npm run build && cd ../server && npm install` |
| `brain.js` / `node-gyp` / `gl` errors | Old dependency | Pull latest code (brain.js was removed; replaced with pure-JS NN) |

---

## 15. Extension Points

### 15.1 PostgreSQL Migration
- Replace `node:sqlite` calls in `db.js` with `pg` driver
- SQL schema changes: convert datatypes (TEXT→UUID, INTEGER→SERIAL, etc.)
- Route logic unchanged (routes currently assume synchronous calls)

### 15.2 Granular Permissions
- Pattern to follow: `requireAdmin` in `auth.js`
- Add `requireRole('staff')` or `requireRole('manager')` middleware
- Apply per-route or per-method (e.g., staff can read but not delete)

### 15.3 AI Assistant Actions
- Currently read-only; to enable actions:
  1. Add confirmation step before any write operation
  2. Only allow specific safe actions (e.g., place_order, record_sale)
  3. Never allow deletion or admin-level changes via AI

### 15.4 Per-Product Forecasting Method
- Currently global setting; to make per-product:
  1. Add `forecast_method` column to `products` table
  2. Modify `productMetrics()` to accept per-product method override
  3. Fall back to global setting when per-product method is null

### 15.5 WebSockets for Real-Time Updates
- Currently all polling-based (refresh on each action)
- Add `ws` or `socket.io` for push updates on stock changes, order receipts

---

## 16. Known Limitations

| Limitation | Description | Future Improvement |
|------------|-------------|-------------------|
| No pagination | Product/order lists load all records | Add LIMIT/OFFSET with server-side pagination |
| Single-user writes | No conflict resolution for concurrent edits | Add optimistic locking (version column) |
| No audit log | No record of who changed what | Add `audit_log` table with user_id, action, timestamp |
| No soft delete | Products delete permanently (cascade to sales) | Add `deleted_at` column; filter in queries |
| SQLite single-writer | `node:sqlite` is synchronous (blocks while writing) | Switch to async driver or read-replica for high concurrency |
| No email notifications | No automated reorder alerts | Integrate with email/SMS service (e.g., SendGrid, Twilio) |
| No backup mechanism | Database is a single file | Add `npm run backup` script to copy DB with timestamp |
| No multi-tenant support | One database per instance | AddNow I have all the source code I need. Let me write the comprehensive system documentation file.

<create_file>
<absolute_path>../Downloads/niz/stockline/SYSTEM_REPORT.md</absolute_path>
<content># Stockline — Complete System Report

**Version:** 1.0.0  
**Repository:** https://github.com/KirbyIOI/stockline  
**Deployment:** Render (Web Service)  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Backend Modules — In-Depth](#5-backend-modules--in-depth)
6. [API Reference](#6-api-reference)
7. [Frontend Components](#7-frontend-components)
8. [Database Schema](#8-database-schema)
9. [Forecasting Engine](#9-forecasting-engine)
10. [Security Model](#10-security-model)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Configuration Reference](#12-configuration-reference)
13. [Known Limitations & Future Work](#13-known-limitations--future-work)

---

## 1. System Overview

Stockline is a **full-stack sales forecasting and inventory management** web application designed for small retail shops, wholesalers, or distributors. It allows users to track inventory, record sales, compute demand forecasts (via multiple mathematical and ML models), generate purchase order suggestions, and maintain team accounts with role-based access.

### Target Audience
- Small businesses in East Africa (Tanzanian context by default — TSh currency, sample products like wimbi flour, kitenge fabric)
- Wholesalers needing reorder alerts across dozens of SKUs
- Single-store shops wanting to digitize without a cloud subscription

### Key Capabilities
- **Four forecasting methods** (linear, Holt smoothing, Holt-Winters seasonal, ML neural network)
- **Role-based access** (Admin vs Staff)
- **Purchasing workflow** (Place → Cancel → Receive orders)
- **AI chat assistant** (optional, powered by Anthropic Claude)
- **CSV export** for inventory and alerts
- **Single-service deployment** (built frontend served by Express)
- **Multi-service deployment** (Netlify/Vercel + Render)

---

## 2. Architecture

```
                                        ┌─────────────────────┐
                                        │   Client Browser    │
                                        │ (React SPA + Vite) │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  Vite Dev Server:    │
                                        │  :5173 (dev only)    │
                                        │  Proxy /api → :4000 │
                                        └──────────┬──────────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │                        │                        │
                    (Dev mode)               (Prod same-origin)       (Prod split host)
                          │                        │                        │
                          ▼                        ▼                        ▼
                   ┌──────────┐           ┌────────────────┐      ┌───────────────────┐
                   │ :4000    │           │ Express (same) │      │ Render/Backend    │
                   │ Express  │           │ serves client/ │      │ Express API :4000 │
                   │ Backend  │           │ dist as static │      │ CORS from frontend│
                   └────┬─────┘           └────────────────┘      └───────────────────┘
                        │
              ┌─────────┼─────────┐
              │         │         │
              ▼         ▼         ▼
        ┌────────┐ ┌────────┐ ┌───────┐
        │SQLite  │ │node:   │ │Claude │
        │DB File │ │sqlite  │ │API    │
        │(data/  │ │(built  │ │(opt.) │
        │inv.db) │ │in)     │ │       │
        └────────┘ └────────┘ └───────┘
```

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Node.js | ≥ 22.5 |
| **Backend framework** | Express | ^4.19.2 |
| **Database** | SQLite via `node:sqlite` | Built-in (no compile!) |
| **Authentication** | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) | ^9.0.2 / ^2.4.3 |
| **AI assistant** | Anthropic Claude SDK (`@anthropic-ai/sdk`) | ^0.21.0 |
| **Security** | helmet + express-rate-limit + cors | Latest |
| **Frontend framework** | React 18 + Vite 5 | ^18.3.1 / ^5.4.1 |
| **Charts** | Recharts | ^2.12.7 |
| **Icons** | lucide-react | ^0.383.0 |
| **CSS** | Inline JS styles (no CSS framework) | Custom |
| **ML (neural net)** | Pure JS implementation | Zero native deps |

### Key Design Decisions

1. **`node:sqlite` over `better-sqlite3`:** Completely avoids C++ native compilation. On Node 22.5+, it's built into the runtime — no `node-gyp`, no Python, no system headers. Critical for deployment on Render free tier where X11/GL headers are absent.

2. **Single-file database:** The entire data store is one SQLite file at `server/data/inventory.db`. No separate database server needed.

3. **Pure-JS neural network:** Brain.js depends on `gl` (WebGL binding) which requires X11 headers at compile time. The custom `SimpleNN` class (in `mlForecast.js`) is a feedforward network with backpropagation written in vanilla JS — zero native dependencies.

4. **Single-service deployment:** By default, the built Vite frontend (`client/dist`) is served directly by Express. This means one Render web service handles everything. CORS is only needed when frontend and backend are hosted separately.

---

## 3. Functional Requirements

### FR-1: Inventory Management (CRUD)
- **Create** products with: name, SKU, category, current stock, unit cost, selling price, lead time (days), safety stock
- **Read** products with computed metrics: forecast, reorder point, days of stock remaining, suggested order quantity, status
- **Update** any product field (recalculates metrics on read)
- **Delete** products (cascades to weekly_sales and orders)
- **Search/filter** products by name, SKU, or category

### FR-2: Sales Recording
- Record units sold for a product per "week" (appends a new `weekly_sales` row at the next `week_index`)
- Automatically decrements product stock on sale
- Sales history drives all forecasting

### FR-3: Demand Forecasting
- **Linear regression:** Ordinary least squares over entire history; stable default for short/noisy histories
- **Holt smoothing:** Double exponential smoothing; reacts faster to recent trends
- **Holt-Winters seasonal:** Additive seasonality; needs ≥2 full cycles; falls back to Holt if insufficient data
- **ML neural network:** Pure-JS feedforward network; needs ≥5 weeks; trains on historical sliding windows
- All models produce: `{ forecast: [{value, low, high}], rmse, slope }`

### FR-4: Reorder Alerts
Per-product status derived from forecast:
- `ok` — stock is sufficient
- `reorder` — stock ≤ reorder point
- `critical` — days of stock remaining ≤ lead time
- `out` — stock = 0
- Bulk purchase order generation from alerts page
- Filtering, sorting, and CSV export of alerts

### FR-5: Purchase Orders Workflow
- **Place** order: select product + quantity → status = `open`
- **Cancel** open order: status → `cancelled`
- **Receive** shipment: specify received units → adds to stock, status → `received`
- Order history view with all statuses

### FR-6: Dashboard KPIs
Aggregated metrics:
- Total product count
- Total inventory value (stock ×
