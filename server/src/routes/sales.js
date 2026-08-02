import { Router } from "express";
import { randomUUID } from "crypto";
import { db, withTransaction } from "../db.js";
import { displayName } from "./products.js";

export const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT ws.id, ws.product_id AS productId, p.name,
           p.sku AS productSku, p.price AS unitPrice, ws.units,
           ws.week_index AS weekIndex, ws.recorded_at AS recordedAt,
           p.qty_per_unit, p.qty_unit_label
    FROM weekly_sales ws
    JOIN products p ON p.id = ws.product_id
    ORDER BY ws.recorded_at DESC, ws.week_index DESC
  `).all();
  res.json(rows.map(r => ({
    id: r.id, productId: r.productId, productName: displayName(r),
    productSku: r.productSku, units: r.units, unitPrice: r.unitPrice,
    totalValue: r.units * r.unitPrice, weekIndex: r.weekIndex, recordedAt: r.recordedAt,
  })));
});

// POST /api/sales — record a batch of sales in one transaction
// Body: { items: [{ productId, units }] }
// Returns a receipt with total, timestamp, and per-item breakdown
router.post("/", (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items array is required with at least one entry" });
  }

  // Validate all items first — check products exist and have enough stock
  const validated = [];
  for (const item of items) {
    const { productId, units } = item || {};
    if (!productId || !units || Number(units) <= 0) {
      return res.status(400).json({ error: "Each item must have a valid productId and units (positive number)" });
    }
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
    if (!product) {
      return res.status(404).json({ error: `Product not found: ${productId}` });
    }
    if (Number(units) > product.stock) {
      return res.status(400).json({ error: `Not enough stock for ${product.name}: have ${product.stock}, trying to sell ${Number(units)}` });
    }
    validated.push({ product, units: Number(units) });
  }

  const saleId = randomUUID();
  const timestamp = new Date().toISOString();
  const receiptItems = [];

  withTransaction(() => {
    for (const { product, units } of validated) {
      // Find the next week index for this product
      const last = db.prepare("SELECT MAX(week_index) AS maxWeek FROM weekly_sales WHERE product_id = ?").get(product.id);
      const nextWeek = (last.maxWeek ?? -1) + 1;

      // Insert the weekly sale record
      db.prepare("INSERT INTO weekly_sales (product_id, week_index, units) VALUES (?, ?, ?)").run(product.id, nextWeek, units);
      // Deduct stock
      db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").run(units, product.id);

      receiptItems.push({
        productId: product.id,
        productName: displayName(product),
        productSku: product.sku,
        unitPrice: product.price,
        units,
        subtotal: units * product.price,
      });
    }
  });

  const grandTotal = receiptItems.reduce((sum, i) => sum + i.subtotal, 0);

  res.status(201).json({
    saleId,
    timestamp,
    items: receiptItems,
    total: grandTotal,
  });
});
