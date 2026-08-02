import { Router } from "express";
import { randomUUID } from "crypto";
import { db, withTransaction } from "../db.js";
import { productMetrics, calculateSafetyStock } from "../forecast.js";
import { getSettings } from "../settings.js";
import { requireAdmin } from "../auth.js";

export const router = Router();

function forecastOptions() {
  const s = getSettings();
  return { method: s.forecastMethod, seasonLength: s.seasonLength };
}

/**
 * Recalculate and persist safety stock for a product based on forecast RMSE.
 * Only recalculates if:
 *  - safety_stock_auto = 1 (not manually overridden)
 *  - the product has at least 8 weeks of sales history
 * Returns the new safety_stock value, or null if unchanged.
 */
export function recalcSafetyStock(productId) {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
  if (!row) return null;
  if (!row.safety_stock_auto) return null;

  const weekly = db
    .prepare("SELECT units FROM weekly_sales WHERE product_id = ? ORDER BY week_index ASC")
    .all(productId)
    .map((r) => r.units);
  if (weekly.length < 8) return null;

  const opts = forecastOptions();
  const product = { id: productId, stock: row.stock, leadTimeDays: row.lead_time_days, safetyStock: row.safety_stock, unitCost: row.unit_cost };
  const metrics = productMetrics(product, weekly, opts);
  const newSafetyStock = calculateSafetyStock(metrics.rmse, row.lead_time_days);
  if (newSafetyStock !== row.safety_stock) {
    db.prepare("UPDATE products SET safety_stock = ? WHERE id = ?").run(newSafetyStock, productId);
  }
  return newSafetyStock;
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
    safetyStockAuto: Boolean(row.safety_stock_auto),
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

  // Seed a short, mostly-flat sales history so metrics are meaningful
  // immediately — but only in proportion to the actual opening stock. A brand
  // new product created with 0 stock starts with 0 seeded sales (a flat chart
  // at zero) rather than phantom history that makes it look established.
  const insertWeek = db.prepare("INSERT INTO weekly_sales (product_id, week_index, units) VALUES (?, ?, ?)");
  const baseline = Math.max(0, Math.round((Number(stock) || 0) / 6));
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

  // If the admin explicitly changed safetyStock (and didn't re-enable auto),
  // disable auto-recalculation so the manual value is respected.
  const safetyStockChanged = req.body.safetyStock !== undefined && Number(req.body.safetyStock) !== existing.safety_stock;
  const reenableAuto = req.body.safetyStockAuto === true;

  db.prepare(`
    UPDATE products SET name=?, sku=?, category=?, stock=?, unit_cost=?, price=?, lead_time_days=?, safety_stock=?, qty_per_unit=?, qty_unit_label=?
    WHERE id=?
  `).run(
    merged.name, merged.sku, merged.category, Number(merged.stock), Number(merged.unitCost),
    Number(merged.price), Number(merged.leadTimeDays), Number(merged.safetyStock),
    Math.max(0, Number(merged.qtyPerUnit) || 0), String(merged.qtyUnitLabel || "").trim().slice(0, 20),
    req.params.id
  );

  if (reenableAuto) {
    db.prepare("UPDATE products SET safety_stock_auto = 1 WHERE id = ?").run(req.params.id);
  } else if (safetyStockChanged) {
    db.prepare("UPDATE products SET safety_stock_auto = 0 WHERE id = ?").run(req.params.id);
  }

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

// POST /api/products/import-sales — bulk import historical sales from CSV data
// Body: { rows: [{ sku, date, units }] }
// Replaces each product's entire weekly_sales history with the imported data.
// Admin-only — this can rewrite forecasting history for many products.
router.post("/import-sales", requireAdmin, (req, res) => {
  const { rows } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows array is required with at least one entry" });
  }

  // Group rows by SKU, validating each row
  const bySku = {};
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sku = String(r.sku || "").trim();
    const dateStr = String(r.date || "").trim();
    const units = Number(r.units);

    if (!sku) { errors.push({ row: i, reason: "Missing SKU" }); continue; }
    if (!dateStr) { errors.push({ row: i, reason: `Missing date for SKU "${sku}"` }); continue; }
    if (!Number.isFinite(units) || units < 0 || !Number.isInteger(units)) {
      errors.push({ row: i, reason: `Invalid units "${r.units}" for SKU "${sku}" — must be a non-negative integer` });
      continue;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      errors.push({ row: i, reason: `Invalid date "${dateStr}" for SKU "${sku}"` });
      continue;
    }

    if (!bySku[sku]) bySku[sku] = [];
    bySku[sku].push({ date, units, rowIndex: i });
  }

  // Look up each SKU's product
  let productsUpdated = 0;
  let weeksImported = 0;
  const notFoundSkus = [];

  withTransaction(() => {
    for (const [sku, rows] of Object.entries(bySku)) {
      const product = db.prepare("SELECT * FROM products WHERE sku = ?").get(sku);
      if (!product) {
        notFoundSkus.push(sku);
        continue;
      }

      // Sort rows by date ascending
      rows.sort((a, b) => a.date - b.date);

      // Delete existing weekly sales for this product
      db.prepare("DELETE FROM weekly_sales WHERE product_id = ?").run(product.id);

      // Insert sorted rows with sequential week_index starting at 0
      const insert = db.prepare("INSERT INTO weekly_sales (product_id, week_index, units, recorded_at) VALUES (?, ?, ?, ?)");
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const weekIndex = i;
        const recordedAt = r.date.toISOString().slice(0, 19).replace("T", " ");
        insert.run(product.id, weekIndex, r.units, recordedAt);
      }

      // Recalculate safety stock (no gating — admin is deliberately providing better data)
      const weekly = rows.map((r) => r.units);
      const opts = forecastOptions();
      const productShaped = { id: product.id, stock: product.stock, leadTimeDays: product.lead_time_days, safetyStock: product.safety_stock, unitCost: product.unit_cost };
      const metrics = productMetrics(productShaped, weekly, opts);
      const newSafetyStock = calculateSafetyStock(metrics.rmse, product.lead_time_days);
      db.prepare("UPDATE products SET safety_stock = ?, safety_stock_auto = 1 WHERE id = ?").run(newSafetyStock, product.id);

      productsUpdated++;
      weeksImported += rows.length;
    }
  });

  // Report SKUs that weren't found as errors
  for (const sku of notFoundSkus) {
    errors.push({ row: null, reason: `SKU "${sku}" not found in products` });
  }

  res.json({ productsUpdated, weeksImported, errors });
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

  // Recalculate safety stock from updated forecast RMSE
  recalcSafetyStock(product.id);

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(product.id);
  const shaped = toProductShape(row);
  const weekly = getWeekly(shaped.id, 1000);
  res.json({ ...shaped, weekly, metrics: productMetrics(shaped, weekly, forecastOptions()) });
});
