import { Router } from "express";
import { randomUUID } from "crypto";
import { db, withTransaction } from "../db.js";

export const router = Router();

function toOrderShape(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.productName || null,
    productSku: row.productSku || null,
    source: row.order_source || 'alert',
    qty: row.qty,
    status: row.status,
    supplierName: row.supplier_name || "",
    placedAt: row.placed_at,
    receivedAt: row.received_at,
  };
}

// GET /api/orders?status=open — list purchase orders, optionally filtered by status
router.get("/", (req, res) => {
  const { status } = req.query;
  const sql = status
    ? `SELECT o.*, p.name AS productName, p.sku AS productSku
       FROM orders o JOIN products p ON p.id = o.product_id
       WHERE o.status = ? ORDER BY o.placed_at DESC`
    : `SELECT o.*, p.name AS productName, p.sku AS productSku
       FROM orders o JOIN products p ON p.id = o.product_id
       ORDER BY o.placed_at DESC`;
  const rows = (status ? db.prepare(sql).all(status) : db.prepare(sql).all());
  res.json(rows.map(toOrderShape));
});

// POST /api/orders — place a purchase order for a product { productId, qty, supplierName }
router.post("/", (req, res) => {
  const { productId, qty, supplierName } = req.body;
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!qty || Number(qty) <= 0) return res.status(400).json({ error: "qty must be a positive number" });

  const id = randomUUID();
  db.prepare("INSERT INTO orders (id, product_id, qty, status, supplier_name, order_source) VALUES (?, ?, ?, 'open', ?, 'manual')").run(id, productId, Number(qty), String(supplierName || ""));
  const row = db.prepare("SELECT o.*, p.name AS productName, p.sku AS productSku FROM orders o JOIN products p ON p.id = o.product_id WHERE o.id = ?").get(id);
  res.status(201).json(toOrderShape(row));
});

// PATCH /api/orders/:id/cancel
router.patch("/:id/cancel", (req, res) => {
  const result = db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'open'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Open order not found" });
  const row = db.prepare("SELECT o.*, p.name AS productName, p.sku AS productSku FROM orders o JOIN products p ON p.id = o.product_id WHERE o.id = ?").get(req.params.id);
  res.json(toOrderShape(row));
});

// PATCH /api/orders/:id/receive { units } — add received units to stock and close the order
router.patch("/:id/receive", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order || order.status !== "open") return res.status(404).json({ error: "Open order not found" });

  const units = Math.max(0, Number(req.body.units) || 0);
  withTransaction(() => {
    db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(units, order.product_id);
    db.prepare("UPDATE orders SET status = 'received', received_at = datetime('now') WHERE id = ?").run(order.id);
  });

  const row = db.prepare("SELECT o.*, p.name AS productName, p.sku AS productSku FROM orders o JOIN products p ON p.id = o.product_id WHERE o.id = ?").get(order.id);
  res.json(toOrderShape(row));
});
