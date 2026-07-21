import { Router } from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db.js";
import { productMetrics } from "../forecast.js";
import { money } from "../format.js";
import { getSettings } from "../settings.js";

// ---------------------------------------------------------------------------
// Gemini Free Tier Rate Limiter – Sliding Window + Exponential Backoff
// ---------------------------------------------------------------------------
// Prevents 429 Too Many Requests / RESOURCE_EXHAUSTED errors by enforcing a
// safe RPM ceiling and retrying with backoff when quota is exceeded.
class GeminiRateLimiter {
  constructor(options = {}) {
    this.queue = [];
    this.activeCount = 0;
    this.requestTimestamps = [];

    // Free tier safety limits
    this.MAX_RPM = options.maxRpm || 10;            // Max 10 requests per minute
    this.WINDOW_MS = options.windowMs || 60 * 1000;  // 1-minute sliding window
    this.MAX_CONCURRENCY = options.maxConcurrency || 1;
    this.MAX_RETRIES = options.maxRetries || 4;      // Max retry attempts on 429
    this.BASE_DELAY = options.baseDelay || 2000;      // Initial backoff ms
    this.MIN_INTERVAL = options.minInterval || 4500;   // 4.5s spacing between calls
  }

  /** Enqueue a Gemini API call, resolving with the result after throttling + retry. */
  async enqueue(apiCallFn) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRetry(apiCallFn);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  /** Process the queue respecting RPM and concurrency ceilings. */
  async processQueue() {
    if (this.queue.length === 0 || this.activeCount >= this.MAX_CONCURRENCY) return;

    // Prune timestamps older than the window
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < this.WINDOW_MS);

    // If at RPM capacity, wait until the oldest timestamp expires
    if (this.requestTimestamps.length >= this.MAX_RPM) {
      const oldest = this.requestTimestamps[0];
      const waitTime = this.WINDOW_MS - (now - oldest) + 500;
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

    // Enforce minimum interval between requests
    if (this.requestTimestamps.length > 0) {
      const last = this.requestTimestamps[this.requestTimestamps.length - 1];
      const elapsed = now - last;
      if (elapsed < this.MIN_INTERVAL) {
        setTimeout(() => this.processQueue(), this.MIN_INTERVAL - elapsed);
        return;
      }
    }

    const task = this.queue.shift();
    if (task) {
      this.activeCount++;
      this.requestTimestamps.push(Date.now());
      try {
        await task();
      } finally {
        this.activeCount--;
        this.processQueue();
      }
    }
  }

  /** Execute a Gemini API call with exponential backoff + jitter on 429. */
  async executeWithRetry(fn) {
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const status = error?.status || error?.response?.status;
        const message =
          error?.message || error?.errorDetails?.[0]?.reason || "";
        const is429 =
          status === 429 ||
          message.includes("RESOURCE_EXHAUSTED") ||
          message.includes("Quota exceeded") ||
          message.includes("Too Many Requests");

        if (!is429 || attempt === this.MAX_RETRIES) {
          throw error; // Non-retriable or out of retries
        }

        // Parse server-recommended retry delay if available (e.g. retryDelay: "21s")
        let delay = this.BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
        const retryAfter =
          error?.retryDelay ||
          error?.response?.headers?.["retry-after"] ||
          error?.response?.headers?.["Retry-After"];
        if (retryAfter) {
          const parsed = parseFloat(String(retryAfter).replace(/s/i, ""));
          if (!isNaN(parsed) && parsed > 0) {
            delay = parsed * 1000 + 500;
          }
        }

        console.warn(
          `[429 Gemini Quota] Retry ${attempt + 1}/${this.MAX_RETRIES} in ${Math.round(delay)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries reached for Gemini API call.");
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Public router: just tells the frontend whether the AI feature is configured,
// so it can hide the chat widget entirely when no API key is set. No auth
// required — it reveals nothing about the business's data.
export const publicRouter = Router();

// Protected router: the actual chat endpoint, mounted behind requireAuth in index.js.
export const router = Router();

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Global Gemini rate limiter singleton
const geminiLimiter = new GeminiRateLimiter();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many questions at once — wait a moment and try again." },
});

// GET /api/assistant/status — lets the frontend know whether to show the chat widget
publicRouter.get("/status", (req, res) => {
  res.json({ enabled: Boolean(genAI), model: MODEL });
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
  if (!genAI) {
    return res.status(503).json({ error: "AI assistant is not configured. Set GEMINI_API_KEY in your environment to enable it." });
  }
  const { message, history } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const priorTurns = Array.isArray(history) ? history.slice(-10) : [];

  // Convert message history to Gemini's format
  // Gemini uses "user" and "model" roles instead of "user" and "assistant"
  const contents = [
    ...priorTurns
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 4000) }],
      })),
    { role: "user", parts: [{ text: message.slice(0, 2000) }] },
  ];

  try {
    const systemContext = systemPrompt() + buildBusinessContext();
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: systemContext,
    });

    // Wrap the API call with the rate limiter for 429 protection
    const result = await geminiLimiter.enqueue(async () => {
      return await model.generateContent({ contents });
    });

    const text = result.response.text().trim();
    res.json({ reply: text || "I wasn't able to generate a response — try rephrasing the question." });
  } catch (err) {
    console.error("Assistant error:", err?.message || err);
    const errorMsg = err?.message || "The AI assistant is temporarily unavailable. Please try again shortly.";
    res.status(502).json({ error: errorMsg });
  }
});
