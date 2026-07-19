import { Router } from "express";
import { db } from "../db.js";
import { productMetrics } from "../forecast.js";
import { getSettings } from "../settings.js";

export const router = Router();

router.get("/summary", (req, res) => {
  const products = db.prepare("SELECT * FROM products").all();
  const settings = getSettings();
  const forecastOptions = { method: settings.forecastMethod, seasonLength: settings.seasonLength };

  let totalInventoryValue = 0;
  let last4WeeksRevenue = 0;
  let prev4WeeksRevenue = 0;
  let totalSuggestedReorderValue = 0;
  const statusCounts = { ok: 0, reorder: 0, critical: 0, out: 0 };

  for (const row of products) {
    const product = {
      id: row.id, stock: row.stock, unitCost: row.unit_cost, price: row.price,
      leadTimeDays: row.lead_time_days, safetyStock: row.safety_stock,
    };
    totalInventoryValue += product.stock * product.unitCost;

    const weeks = db.prepare("SELECT units FROM weekly_sales WHERE product_id = ? ORDER BY week_index ASC").all(row.id).map((r) => r.units);
    const last4 = weeks.slice(-4);
    const prev4 = weeks.slice(-8, -4);
    last4WeeksRevenue += last4.reduce((a, b) => a + b, 0) * product.price;
    prev4WeeksRevenue += prev4.reduce((a, b) => a + b, 0) * product.price;

    const m = productMetrics(product, weeks, forecastOptions);
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
    totalSuggestedReorderValue += m.suggestedOrder * product.unitCost;
  }

  const revenueDelta = prev4WeeksRevenue > 0 ? ((last4WeeksRevenue - prev4WeeksRevenue) / prev4WeeksRevenue) * 100 : 0;
  const openOrders = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'open'").get();

  res.json({
    productCount: products.length,
    totalInventoryValue,
    last4WeeksRevenue,
    prev4WeeksRevenue,
    revenueDelta,
    statusCounts,
    totalSuggestedReorderValue,
    openOrdersCount: openOrders.n,
  });
});
