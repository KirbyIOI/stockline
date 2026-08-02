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

  // Stagger the recorded_at timestamp so seeded history shows a realistic
  // spread of dates/times (one sale per week going back ~14 weeks) rather
  // than everything appearing to happen at the same instant.
  function sqliteStamp(weeksAgo, offsetHours) {
    const d = new Date(Date.now() - weeksAgo * 7 * 86400000 - offsetHours * 3600000);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  withTransaction(() => {
    for (const p of SEED_PRODUCTS) {
      const id = randomUUID();
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
  });
  console.log(`Seeded ${SEED_PRODUCTS.length} products with 14 weeks of sales history each.`);
}

// Allow running directly: `npm run seed` (add --force to wipe and reseed)
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes("--force");
  if (force) {
    db.exec("DELETE FROM orders; DELETE FROM weekly_sales; DELETE FROM products;");
  }
  seed({ force: true });
}
