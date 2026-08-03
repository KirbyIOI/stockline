import { randomUUID } from "crypto";
import { db, isEmpty, withTransaction } from "./db.js";

function seedSeries(base, trend, noise, weeks = 14) {
  const arr = [];
  let v = base;
  for (let i = 0; i < weeks; i++) {
    v = Math.max(0, v + trend + (Math.random() - 0.5) * noise);
    arr.push(Math.round(v));
  }
  return arr;
}

const SEED_PRODUCTS = [
  {
    name: "Wimbi Flour", sku: "WMB-050", category: "Grains & Flour",
    qtyPerUnit: 50, qtyUnitLabel: "kg",
    stock: 42, unitCost: 38000, price: 48000, leadTimeDays: 7, safetyStock: 20,
    weekly: seedSeries(24, 0.6, 6),
  },
  {
    name: "Jerrican Cooking Oil", sku: "OIL-020", category: "Cooking Oil",
    qtyPerUnit: 20, qtyUnitLabel: "litres",
    stock: 15, unitCost: 62000, price: 78000, leadTimeDays: 14, safetyStock: 15,
    weekly: seedSeries(18, 0.9, 5),
  },
  {
    name: "Kitenge Fabric", sku: "KTG-006", category: "Textiles",
    qtyPerUnit: 6, qtyUnitLabel: "yards",
    stock: 130, unitCost: 15000, price: 25000, leadTimeDays: 10, safetyStock: 30,
    weekly: seedSeries(30, -0.4, 7),
  },
  {
    name: "Crown Cement", sku: "CEM-050", category: "Building Materials",
    qtyPerUnit: 50, qtyUnitLabel: "kg",
    stock: 8, unitCost: 15500, price: 18500, leadTimeDays: 5, safetyStock: 25,
    weekly: seedSeries(40, 0.3, 9),
  },
  {
    name: "Solar Home Lantern Kit", sku: "SLK-100", category: "Electronics",
    stock: 60, unitCost: 32000, price: 55000, leadTimeDays: 30, safetyStock: 10,
    weekly: seedSeries(12, 1.1, 4),
  },
  {
    name: "Kiondoo Woven Basket", sku: "KWB-140", category: "Home & Crafts",
    stock: 5, unitCost: 8000, price: 15000, leadTimeDays: 14, safetyStock: 12,
    weekly: seedSeries(14, -0.2, 4),
  },
];

// Realistic Tanzanian wholesale suppliers, used to give seeded purchase orders
// real supplier names so the Purchase Order page's Supplier column never reads
// N/A on sample data.
const SUPPLIERS = [
  "TZ Wholesale Ltd",
  "Dar es Salaam Distributors",
  "Kilimanjaro Supply Co.",
  "Kariakoo General Suppliers",
  "Mwanza Traders Ltd",
  "Ubungo Wholesale Mart",
  "Arusha Goods & Co.",
  "Morogoro Agro Supply",
  "Tanga Hardware Traders",
  "Dodoma Central Suppliers",
  "Coastal Logistics Ltd",
  "Zanzibar Imports Ltd",
];

// Historical purchase orders seeded alongside the sample products — all
// received or cancelled, placed over the past ~10 weeks, and split between
// manual POs and system-generated ("alert") reorder suggestions.
//
// IMPORTANT: no "open" orders are ever seeded. On a fresh install the
// Purchase Orders page starts completely clean, so there is nothing to
// accidentally "receive" (which would add stock) before the owner places
// their first real order.
const SEED_ORDERS = [
  { product: "Wimbi Flour", qty: 100, status: "received", weeksAgo: 9, source: "manual" },
  { product: "Wimbi Flour", qty: 80, status: "received", weeksAgo: 1, source: "alert" },
  { product: "Jerrican Cooking Oil", qty: 40, status: "received", weeksAgo: 7, source: "alert" },
  { product: "Jerrican Cooking Oil", qty: 50, status: "received", weeksAgo: 3, source: "manual" },
  { product: "Kitenge Fabric", qty: 120, status: "received", weeksAgo: 8, source: "manual" },
  { product: "Kitenge Fabric", qty: 90, status: "received", weeksAgo: 2, source: "alert" },
  { product: "Crown Cement", qty: 200, status: "received", weeksAgo: 6, source: "manual" },
  { product: "Crown Cement", qty: 150, status: "cancelled", weeksAgo: 4, source: "alert" },
  { product: "Solar Home Lantern Kit", qty: 30, status: "received", weeksAgo: 10, source: "manual" },
  { product: "Solar Home Lantern Kit", qty: 25, status: "received", weeksAgo: 1, source: "alert" },
  { product: "Kiondoo Woven Basket", qty: 60, status: "received", weeksAgo: 5, source: "alert" },
  { product: "Kiondoo Woven Basket", qty: 40, status: "received", weeksAgo: 2, source: "manual" },
];

export function seed({ force = false } = {}) {
  if (!force && !isEmpty()) {
    console.log("Database already has data — skipping seed (pass --force to reseed).");
    return;
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, sku, category, stock, unit_cost, price, lead_time_days, safety_stock, qty_per_unit, qty_unit_label)
    VALUES (@id, @name, @sku, @category, @stock, @unitCost, @price, @leadTimeDays, @safetyStock, @qtyPerUnit, @qtyUnitLabel)
  `);
  const insertWeek = db.prepare(`
    INSERT INTO weekly_sales (product_id, week_index, units, recorded_at) VALUES (?, ?, ?, ?)
  `);
  const insertOrder = db.prepare(`
    INSERT INTO orders (id, product_id, qty, status, placed_at, received_at, supplier_name, order_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Stagger the recorded_at timestamp so seeded history shows a realistic
  // spread of dates/times (one sale per week going back ~14 weeks) rather
  // than everything appearing to happen at the same instant.
  function sqliteStamp(weeksAgo, offsetHours) {
    const d = new Date(Date.now() - weeksAgo * 7 * 86400000 - offsetHours * 3600000);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  withTransaction(() => {
    // Map product name → seeded id so the SEED_ORDERS list can reference
    // products by name.
    const idByName = {};
    for (const p of SEED_PRODUCTS) {
      const id = randomUUID();
      idByName[p.name] = id;
      insertProduct.run({
        id, name: p.name, sku: p.sku, category: p.category, stock: p.stock,
        unitCost: p.unitCost, price: p.price, leadTimeDays: p.leadTimeDays, safetyStock: p.safetyStock,
        qtyPerUnit: p.qtyPerUnit || 0, qtyUnitLabel: p.qtyUnitLabel || "",
      });
      p.weekly.forEach((units, weekIndex) => {
        // weeksAgo runs 13..0 (oldest first), with a per-product hour offset
        // so different products also land at different times of day.
        insertWeek.run(id, weekIndex, units, sqliteStamp(13 - weekIndex, weekIndex * 1.7));
      });
    }

    // Seed realistic purchase order history. Suppliers are picked round-robin
    // so each order gets a distinct, realistic name, and "received" orders get
    // a received_at a few days after they were placed.
    SEED_ORDERS.forEach((o, i) => {
      const supplier = SUPPLIERS[i % SUPPLIERS.length];
      const placed = new Date(Date.now() - o.weeksAgo * 7 * 86400000 - i * 3600000);
      const p = (n) => String(n).padStart(2, "0");
      const stamp = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      const received = o.status === "received"
        ? stamp(new Date(placed.getTime() + (2 + (i % 4)) * 86400000))
        : null;
      insertOrder.run(
        randomUUID(),
        idByName[o.product],
        o.qty,
        o.status,
        stamp(placed),
        received,
        supplier,
        o.source
      );
    });
  });
  console.log(`Seeded ${SEED_PRODUCTS.length} products with 14 weeks of sales history each.`);
}

// Backfill supplier names onto any existing orders that were created before
// the supplier_name column existed (or without one). Called on every startup
// so existing deployments pick up realistic supplier names without a reset —
// it only touches orders that currently have an empty supplier.
export function backfillOrderSuppliers() {
  const rows = db.prepare("SELECT id FROM orders WHERE supplier_name = ''").all();
  if (rows.length === 0) return;
  const stmt = db.prepare("UPDATE orders SET supplier_name = ? WHERE id = ?");
  rows.forEach((row, i) => {
    stmt.run(SUPPLIERS[i % SUPPLIERS.length], row.id);
  });
  console.log(`Backfilled supplier names on ${rows.length} order(s).`);
}

// Allow running directly: `npm run seed` (add --force to wipe and reseed)
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes("--force");
  if (force) {
    db.exec("DELETE FROM orders; DELETE FROM weekly_sales; DELETE FROM products;");
  }
  seed({ force: true });
}
