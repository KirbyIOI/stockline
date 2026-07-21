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
    this.MAX_RPM = options.maxRpm || 10;
    this.WINDOW_MS = options.windowMs || 60 * 1000;
    this.MAX_CONCURRENCY = options.maxConcurrency || 1;
    this.MAX_RETRIES = options.maxRetries || 5;
    this.BASE_DELAY = options.baseDelay || 2000;
    this.MIN_INTERVAL = options.minInterval || 4500;
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

    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < this.WINDOW_MS);

    if (this.requestTimestamps.length >= this.MAX_RPM) {
      const oldest = this.requestTimestamps[0];
      const waitTime = this.WINDOW_MS - (now - oldest) + 500;
      setTimeout(() => this.processQueue(), waitTime);
      return;
    }

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

  /** Extract a retry delay (ms) from Gemini 429 error payloads.
   *  Handles RetryInfo {"retryDelay":"39s"}, "retry in 39s", and headers. */
  _parseRetryDelay(error) {
    // 1. Direct property on the error object
    if (error?.retryDelay) {
      const parsed = parseFloat(String(error.retryDelay).replace(/s/gi, ""));
      if (!isNaN(parsed) && parsed > 0) return parsed * 1000 + 500;
    }

    // 2. HTTP retry-after header
    const retryAfter = error?.response?.headers?.["retry-after"] ||
                       error?.response?.headers?.["Retry-After"];
    if (retryAfter) {
      const parsed = parseFloat(String(retryAfter));
      if (!isNaN(parsed) && parsed > 0) return parsed * 1000;
    }

    // 3. Deep search of full error text for Google RPC RetryInfo JSON payload
    const text = typeof error === "string" ? error :
                 error?.message || error?.toString?.() || JSON.stringify(error);
    // "retryDelay":"39.34646009s"
    const retryInfoMatch = text.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
    if (retryInfoMatch) {
      const seconds = parseFloat(retryInfoMatch[1]);
      if (!isNaN(seconds) && seconds > 0) return seconds * 1000 + 500;
    }
    // "Please retry in 39.34646009s"
    const retryInMatch = text.match(/(?:retry|try\s*again)\s+in\s+([\d.]+)\s*s(?:econds?)?/i);
    if (retryInMatch) {
      const seconds = parseFloat(retryInMatch[1]);
      if (!isNaN(seconds) && seconds > 0) return seconds * 1000 + 500;
    }

    return null;
  }

  /** Execute with exponential backoff + jitter on 429. */
  async executeWithRetry(fn) {
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        // Check full error text for 429/quota signals
        const errText = error?.message || error?.toString?.() || JSON.stringify(error);
        const status = error?.status || error?.response?.status;
        const isRetriable =
          status === 429 ||
          errText.includes("429") ||
          errText.includes("RESOURCE_EXHAUSTED") ||
          errText.includes("Quota exceeded") ||
          errText.includes("quota") ||
          errText.includes("Too Many Requests") ||
          errText.includes("rate_limit") ||
          errText.includes("RETRY_INFO");

        if (!isRetriable) throw error;

        // Use server-recommended delay if available (RetryInfo), otherwise exponential backoff
        let delay = this._parseRetryDelay(error);
        if (delay === null) {
          delay = this.BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
        }

        if (attempt >= this.MAX_RETRIES) {
          throw new Error(
            `Gemini API still unavailable after ${this.MAX_RETRIES} retries. Last delay was ${Math.round(delay)}ms.`
          );
        }

        console.warn(
          `[429 Gemini Quota] Attempt ${attempt + 1}/${this.MAX_RETRIES} — waiting ${Math.round(delay)}ms before retry`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const publicRouter = Router();
export const router = Router();

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const geminiLimiter = new GeminiRateLimiter();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many questions at once — wait a moment and try again." },
});

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

router.post("/chat", chatLimiter, async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: "AI assistant is not configured. Set GEMINI_API_KEY in your environment to enable it." });
  }
  const { message, history } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  const priorTurns = Array.isArray(history) ? history.slice(-10) : [];
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

    // Throttle + retry the API call through the rate limiter queue
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
