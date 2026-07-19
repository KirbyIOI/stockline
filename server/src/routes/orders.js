import { Router } from "express";
import { randomUUID } from "crypto";
import { db, withTransaction } from "../db.js";

export const router = Router();

function toOrderShape(row) {
  return {
    id: row.id,
    productId: row.product_id,
    qty: row.qty,
    status: row.status,
    placedAt: row.placed_at,
    receivedAt: row.received_at,
  };
}

// GET /api/orders?status=open — list purchase orders, optionally filtered by status
router.get("/", (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY placed_at DESC").all(status)
    : db.prepare("SELECT * FROM orders ORDER BY placed_at DESC").all();
  res.json(rows.map(toOrderShape));
});

// POST /api/orders — place a purchase order for a product { productId, qty }
router.post("/", (req, res) => {
  const { productId, qty } = req.body;
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!qty || Number(qty) <= 0) return res.status(400).json({ error: "qty must be a positive number" });

  const id = randomUUID();
  db.prepare("INSERT INTO orders (id, product_id, qty, status) VALUES (?, ?, ?, 'open')").run(id, productId, Number(qty));
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  res.status(201).json(toOrderShape(row));
});

// PATCH /api/orders/:id/cancel
router.patch("/:id/cancel", (req, res) => {
  const result = db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'open'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Open order not found" });
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
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

  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
  res.json(toOrderShape(row));
});
