import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import "dotenv/config";

const dbPath = process.env.DB_PATH || "./data/inventory.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    lead_time_days INTEGER NOT NULL DEFAULT 14,
    safety_stock INTEGER NOT NULL DEFAULT 0,
    safety_stock_auto INTEGER NOT NULL DEFAULT 1,
    qty_per_unit REAL NOT NULL DEFAULT 0,
    qty_unit_label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    week_index INTEGER NOT NULL,
    units INTEGER NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_weekly_sales_product ON weekly_sales(product_id, week_index);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    placed_at TEXT NOT NULL DEFAULT (datetime('now')),
    received_at TEXT,
    supplier_name TEXT NOT NULL DEFAULT '',
    order_source TEXT NOT NULL DEFAULT 'alert'
  );

  CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id, status);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT '',
    currency_symbol TEXT NOT NULL DEFAULT 'TSh',
    forecast_method TEXT NOT NULL DEFAULT 'linear',
    season_length INTEGER NOT NULL DEFAULT 4,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);


try {
  db.exec("ALTER TABLE orders ADD COLUMN supplier_name TEXT NOT NULL DEFAULT '';");
} catch {
  // Column already exists — this is fine.
}
try {
  db.exec("ALTER TABLE orders ADD COLUMN order_source TEXT NOT NULL DEFAULT 'alert';");
} catch {
  // Column already exists — this is fine.
}
// Migration for projects created before qty-per-unit existed: add the columns
// so an existing deployed DB picks up the new feature without a reset.
const productCols = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
if (!productCols.includes("qty_per_unit")) {
  db.exec("ALTER TABLE products ADD COLUMN qty_per_unit REAL NOT NULL DEFAULT 0;");
}
if (!productCols.includes("qty_unit_label")) {
  db.exec("ALTER TABLE products ADD COLUMN qty_unit_label TEXT NOT NULL DEFAULT '';");
}
if (!productCols.includes("safety_stock_auto")) {
  db.exec("ALTER TABLE products ADD COLUMN safety_stock_auto INTEGER NOT NULL DEFAULT 1;");
}

export function isEmpty() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM products").get();
  return row.n === 0;
}

// node:sqlite's DatabaseSync has no built-in `.transaction()` helper (unlike
// better-sqlite3), so this wraps a block of statements in BEGIN/COMMIT/ROLLBACK.
export function withTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
