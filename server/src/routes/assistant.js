import { Router } from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db.js";
import { productMetrics } from "../forecast.js";
import { money } from "../format.js";
import { getSettings } from "../settings.js";

// Public router: just tells the frontend whether the AI feature is configured,
// so it can hide the chat widget entirely when no API key is set. No auth
// required — it reveals nothing about the business's data.
export const publicRouter = Router();

// Protected router: the actual chat endpoint, mounted behind requireAuth in index.js.
export const router = Router();

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many questions at once — wait a moment and try again." },
});

// GET /api/assistant/status — lets the frontend know whether to show the chat widget
publicRouter.get("/status", (req, res) => {
  res.json({ enabled: Boolean(client), model: MODEL });
});

function buildBusinessContext() {
  const settings = getSettings();
  const cur = (n) => money(n, settings.currencySymbol);
  const rows = db.prepare("SELECT * FROM products ORDER BY name ASC").all();
  const orders = db.prepare("SELECT * FROM orders WHERE status = 'open' ORDER BY placed_at DESC").all();

  const lines = [];
  let totalInventoryValue = 0;

  for (const row of rows) {
    const product = {
      id: row.id, stock: row.stock, unitCost: row.unit_cost, price: row.price,
      leadTimeDays: row.lead_time_days, safetyStock: row.safety_stock,
    };
    const weekly = db.prepare("SELECT units FROM weekly_sales WHERE product_id = ? ORDER BY week_index ASC")
      .all(row.id).map((r) => r.units);
    const m = productMetrics(product, weekly, { method: settings.forecastMethod, seasonLength: settings.seasonLength });
    totalInventoryValue += product.stock * product.unitCost;

    lines.push(
      `- ${row.name} (SKU ${row.sku}, ${row.category || "uncategorized"}): ${row.stock} units in stock, ` +
      `status=${m.status}, reorder point ${m.reorderPoint}, ${Number.isFinite(m.daysOfStock) ? Math.round(m.daysOfStock) + " days" : "no sales history"} of runway, ` +
      `avg ${m.avgWeekly.toFixed(1)} units/week, suggested reorder ${m.suggestedOrder} units (${cur(m.suggestedOrder * product.unitCost)}), ` +
      `unit cost ${cur(product.unitCost)}, sale price ${cur(product.price)}, lead time ${product.leadTimeDays}d.`
    );
  }

  const orderLines = orders.length
    ? orders.map((o) => {
        const p = rows.find((r) => r.id === o.product_id);
        return `- ${p ? p.name : o.product_id}: ${o.qty} units on order since ${o.placed_at}`;
      })
    : ["- none"];

  return [
    `Today's date: ${new Date().toISOString().slice(0, 10)}`,
    `Forecasting method in use: ${settings.forecastMethod}.`,
    `Total SKUs: ${rows.length}. Total inventory value: ${cur(totalInventoryValue)}.`,
    "",
    "Per-product snapshot:",
    ...lines,
    "",
    "Open purchase orders:",
    ...orderLines,
  ].join("\n");
}

function systemPrompt() {
  const settings = getSettings();
  const business = settings.companyName ? ` for ${settings.companyName}` : "";
  return `You are the in-app assistant for Stockline, a sales forecasting and inventory management tool${business}. Prices are shown in ${settings.currencySymbol}. You are given a live snapshot of the user's current product, stock, and order data below. Use it to answer questions about what to reorder, which products are trending up or down, revenue and stock-value questions, and general inventory/forecasting concepts.

Rules:
- Base numeric answers only on the data provided below; don't invent figures.
- Keep answers short and practical — this is a busy shop owner, not an analyst. Prefer a few sentences or a short bullet list over long essays.
- If asked to take an action (place an order, edit a product), explain that you can't directly change data yet, and tell them exactly which button/page to use in the app (Inventory, Alerts, or the Forecast page).
- If the data doesn't cover what's asked, say so plainly instead of guessing.

Current business data:
`;
}

// POST /api/assistant/chat { message, history? } — ask a question about the current inventory data
router.post("/chat", chatLimiter, async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: "AI assistant is not configured. Set ANTHROPIC_API_KEY in server/.env to enable it." });
  }
  const { message, history } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const priorTurns = Array.isArray(history) ? history.slice(-10) : [];
  const messages = [
    ...priorTurns
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
    { role: "user", content: message.slice(0, 2000) },
  ];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt() + buildBusinessContext(),
      messages,
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    res.json({ reply: text || "I wasn't able to generate a response — try rephrasing the question." });
  } catch (err) {
    console.error("Assistant error:", err?.message || err);
    res.status(502).json({ error: "The AI assistant is temporarily unavailable. Please try again shortly." });
  }
});
