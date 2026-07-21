import { Router } from "express";
import { db } from "../db.js";

export const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT ws.id, ws.product_id AS productId, p.name AS productName,
           p.sku AS productSku, p.price AS unitPrice, ws.units,
           ws.week_index AS weekIndex, ws.recorded_at AS recordedAt
    FROM weekly_sales ws
    JOIN products p ON p.id = ws.product_id
    ORDER BY ws.recorded_at DESC, ws.week_index DESC
  `).all();
  res.json(rows.map(r => ({
    id: r.id, productId: r.productId, productName: r.productName,
    productSku: r.productSku, units: r.units, unitPrice: r.unitPrice,
    totalValue: r.units * r.unitPrice, weekIndex: r.weekIndex, recordedAt: r.recordedAt,
  })));
});
