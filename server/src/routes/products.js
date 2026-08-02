import { Router } from "express";
import { randomUUID } from "crypto";
import { db, withTransaction } from "../db.js";
import { productMetrics } from "../forecast.js";
import { getSettings } from "../settings.js";

export const router = Router();

function forecastOptions() {
  const s = getSettings();
  return { method: s.forecastMethod, seasonLength: s.seasonLength };
}

// Builds the name shown across the app. Products sold in bulk/packages get
// their quantity in parentheses — e.g. "Jerrican Cooking Oil (20 litres)" —
// while ordinary single-unit items (a TV, a basket) keep just their name.
export function displayName(product) {
  const qty = Number(product?.qty_per_unit) || 0;
  const label = (product?.qty_unit_label || "").trim();
  if (qty > 0 && label) return `${product.name} (${qty} ${label})`;
  if (qty > 0) return `${product.name} (${qty} units)`;
  return product.name;
}

function toProductShape(row) {
  return {
    id: row.id,
    name: row.name,
    displayName: displayName(row),
    sku: row.sku,
    category: row.category,
    stock: row.stock,
    unitCost: row.unit_cost,
    price: row.price,
    leadTimeDays: row.lead_time_days,
    safetyStock: row.safety_stock,
    qtyPerUnit: row.qty_per_unit || 0,
    qtyUnitLabel: row.qty_unit_label || "",
  };
}

function getWeekly(productId, limit = 14) {
  const rows = db
    .prepare("SELECT units FROM weekly_sales WHERE product_id = ? ORDER BY week_index ASC LIMIT ?")
    .all(productId, limit);
  return rows.map((r) => r.units);
}

// GET /api/sales-history — all recorded sales joined with product info
router.get("/sales-history", (req, res) => {
  const rows = db.prepare(`
    SELECT ws.id, ws.product_id, ws.units, ws.recorded_at,
           p.name AS product_name, p.sku AS product_sku, p.price AS unit_price,
           p.qty_per_unit, p.qty_unit_label
    FROM weekly_sales ws
    JOIN products p ON p.id = ws.product_id
    ORDER BY ws.recorded_at DESC
  `).all();
  const result = rows.map((r) => ({
    id: r.id,
    productName: displayName(r),
    productSku: r.product_sku,
    units: r.units,
    unitPrice: r.unit_price,
    totalValue: r.units * r.unit_price,
    recordedAt: r.recorded_at,
  }));
  res.json(result);
});

// GET /api/products — list every product with computed forecasting/inventory metrics
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY created_at ASC").all();
  const options = forecastOptions();
  const products = rows.map((row) => {
    const product = toProductShape(row);
    const weekly = getWeekly(product.id, 1000);
    return { ...product, metrics: productMetrics(product, weekly, options) };
  });
  res.json(products);
});

// GET /api/products/:id — single product with full weekly history for charting
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Product not found" });
  const product = toProductShape(row);
  const weekly = getWeekly(product.id, 1000);
  res.json({ ...product, weekly, metrics: productMetrics(product, weekly, forecastOptions()) });
});

// Reject products whose sale price is below cost — selling below cost is
// almost always a data-entry error.
function validatePricing(unitCost, price) {
  const cost = Number(unitCost) || 0;
  const sale = Number(price) || 0;
  if (cost > sale) {
    return { error: `Sale price (${sale}) must be greater than or equal to the unit cost (${cost})` };
  }
  return null;
}

// POST /api/products — create a new product
router.post("/", (req, res) => {
  const { name, sku, category, stock, unitCost, price, leadTimeDays, safetyStock, qtyPerUnit, qtyUnitLabel } = req.body;
  if (!name || !sku) return res.status(400).json({ error: "name and sku are required" });

  const pricingError = validatePricing(unitCost, price);
  if (pricingError) return res.status(400).json(pricingError);

  const id = randomUUID();
  try {
    db.prepare(`
      INSERT INTO products (id, name, sku, category, stock, unit_cost, price, lead_time_days, safety_stock, qty_per_unit, qty_unit_label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, sku, category || "", Number(stock) || 0, Number(unitCost) || 0,
      Number(price) || 0, Number(leadTimeDays) || 14, Number(safetyStock) || 0,
      Math.max(0, Number(qtyPerUnit) || 0), String(qtyUnitLabel || "").trim().slice(0, 20)
    );
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: `SKU "${sku}" already exists` });
    }
    throw err;
  }

  // seed a short, mostly-flat sales history so metrics are meaningful immediately
  const insertWeek = db.prepare("INSERT INTO weekly_sales (product_id, week_index, units) VALUES (?, ?, ?)");
  const baseline = Math.max(1, Math.round((Number(stock) || 8) / 6));
  for (let i = 0; i < 4; i++) insertWeek.run(id, i, baseline);

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  const product = toProductShape(row);
  const weekly = getWeekly(id, 1000);
  res.status(201).json({ ...product, weekly, metrics: productMetrics(product, weekly, forecastOptions()) });
});

// PUT /api/products/:id — update product fields
router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const merged = { ...toProductShape(existing), ...req.body };

  const pricingError = validatePricing(merged.unitCost, merged.price);
  if (pricingError) return res.status(400).json(pricingError);
  db.prepare(`
    UPDATE products SET name=?, sku=?, category=?, stock=?, unit_cost=?, price=?, lead_time_days=?, safety_stock=?, qty_per_unit=?, qty_unit_label=?
    WHERE id=?
  `).run(
    merged.name, merged.sku, merged.category, Number(merged.stock), Number(merged.unitCost),
    Number(merged.price), Number(merged.leadTimeDays), Number(merged.safetyStock),
    Math.max(0, Number(merged.qtyPerUnit) || 0), String(merged.qtyUnitLabel || "").trim().slice(0, 20),
    req.params.id
  );

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  const product = toProductShape(row);
  const weekly = getWeekly(product.id, 1000);
  res.json({ ...product, weekly, metrics: productMetrics(product, weekly, forecastOptions()) });
});

// DELETE /api/products/:id
router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Product not found" });
  res.status(204).end();
});

// POST /api/products/:id/sales — record units sold this week (advances the forecast window)
router.post("/:id/sales", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });

  const units = Math.max(0, Number(req.body.units) || 0);
  const last = db.prepare("SELECT MAX(week_index) AS maxWeek FROM weekly_sales WHERE product_id = ?").get(product.id);
  const nextWeek = (last.maxWeek ?? -1) + 1;

  withTransaction(() => {
    db.prepare("INSERT INTO weekly_sales (product_id, week_index, units) VALUES (?, ?, ?)").run(product.id, nextWeek, units);
    db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").run(units, product.id);
  });

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(product.id);
  const shaped = toProductShape(row);
  const weekly = getWeekly(shaped.id, 1000);
  res.json({ ...shaped, weekly, metrics: productMetrics(shaped, weekly, forecastOptions()) });
});
