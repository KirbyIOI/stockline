import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { getSettings, updateSettings } from "../settings.js";
import { trainAllProducts } from "../forecast.js";
import { db } from "../db.js";

export const router = Router();

// Any signed-in user can read settings — needed for currency display,
// company name in the sidebar, and knowing which forecast method is active.
router.get("/", (req, res) => {
  res.json(getSettings());
});

// Only admins can change them.
router.put("/", requireAdmin, (req, res) => {
  const { companyName, currencySymbol, forecastMethod, seasonLength } = req.body || {};

  const errors = [];
  if (forecastMethod !== undefined && !["linear", "smoothed", "seasonal", "ml"].includes(forecastMethod)) {
    errors.push("forecastMethod must be linear, smoothed, seasonal, or ml");
  }
  let season;
  if (seasonLength !== undefined) {
    season = Number(seasonLength);
    if (!Number.isInteger(season) || season < 2 || season > 52) {
      errors.push("seasonLength must be a whole number between 2 and 52");
    }
  }
  if (currencySymbol !== undefined && String(currencySymbol).length > 10) {
    errors.push("currencySymbol must be 10 characters or fewer");
  }
  if (companyName !== undefined && String(companyName).length > 80) {
    errors.push("companyName must be 80 characters or fewer");
  }
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const updated = updateSettings({
    companyName: companyName !== undefined ? String(companyName) : undefined,
    currencySymbol: currencySymbol !== undefined ? String(currencySymbol) : undefined,
    forecastMethod,
    seasonLength: season,
  });

  // If switching to "ml", pre-train models on all products so predictions are ready immediately
  if (forecastMethod === "ml") {
    trainAllProducts(() => {
      const rows = db.prepare("SELECT * FROM products").all();
      return rows.map((r) => ({
        id: r.id,
        weekly: db.prepare("SELECT units FROM weekly_sales WHERE product_id = ? ORDER BY week_index ASC").all(r.id).map((w) => w.units),
      }));
    });
  }

  res.json(updated);
});
