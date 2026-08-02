// Sales forecasting: three selectable models + one ML model, all producing
// the same shape ({ forecast: [{value, low, high}], rmse, slope }) so the
// rest of the app doesn't need to know which one is active. The active
// method is a global setting (see settings.js) rather than per-product.
//
//  - "linear"   Ordinary least-squares regression over the whole history.
//               Simple and stable, but slow to react to a recent change in
//               trend. Good default for short or noisy histories.
//  - "smoothed" Holt's linear (double) exponential smoothing. Weights recent
//               weeks more heavily, so it reacts faster to a real change in
//               sell-through. Better once you have 6+ weeks of history.
//  - "seasonal" Holt-Winters (triple) exponential smoothing, additive.
//               Adds a repeating seasonal pattern on top of the trend (e.g.
//               a monthly cycle if seasonLength=4). Needs at least two full
//               cycles of history — falls back to "smoothed" until then.
//  - "ml"       Neural network trained per-product on its weekly sales
//               history. Learns non-linear patterns. Falls back to "linear"
//               if insufficient training data (< 5 weeks of history).

import { mlForecast, trainProduct, saveModels } from "./mlForecast.js";

const HORIZON = 6;

function emptyResult(horizon) {
  return {
    forecast: Array.from({ length: horizon }, () => ({ value: 0, low: 0, high: 0 })),
    rmse: 0,
    slope: 0,
  };
}

function clampForecast(rawForecast, rmse) {
  return rawForecast.map((val) => ({
    value: Math.round(Math.max(0, val)),
    low: Math.round(Math.max(0, val - rmse)),
    high: Math.round(Math.max(0, val + rmse)),
  }));
}

/** Ordinary least-squares linear regression. */
export function linearForecast(weekly, horizon = HORIZON) {
  const n = weekly.length;
  if (n === 0) return emptyResult(horizon);

  const xs = weekly.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = weekly.reduce((a, b) => a + b, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (weekly[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let sse = 0;
  for (let i = 0; i < n; i++) sse += (weekly[i] - (intercept + slope * xs[i])) ** 2;
  const rmse = Math.sqrt(sse / Math.max(1, n - 2));

  const raw = Array.from({ length: horizon }, (_, i) => intercept + slope * (n + i));
  return { forecast: clampForecast(raw, rmse), rmse, slope };
}

/** Holt's linear (double) exponential smoothing. */
export function smoothedForecast(weekly, horizon = HORIZON, alpha = 0.4, beta = 0.3) {
  const n = weekly.length;
  if (n === 0) return emptyResult(horizon);
  if (n === 1) {
    const v = weekly[0];
    return { forecast: clampForecast(Array(horizon).fill(v), 0), rmse: 0, slope: 0 };
  }

  let level = weekly[0];
  let trend = weekly[1] - weekly[0];
  let sse = 0, count = 0;

  for (let i = 1; i < n; i++) {
    const actual = weekly[i];
    const oneStepAheadPred = level + trend;
    sse += (actual - oneStepAheadPred) ** 2;
    count++;

    const prevLevel = level;
    level = alpha * actual + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const rmse = count > 0 ? Math.sqrt(sse / count) : 0;

  const raw = Array.from({ length: horizon }, (_, i) => level + (i + 1) * trend);
  return { forecast: clampForecast(raw, rmse), rmse, slope: trend };
}

/** Holt-Winters (triple) exponential smoothing, additive seasonality. */
export function seasonalForecast(weekly, horizon = HORIZON, seasonLength = 4, alpha = 0.3, beta = 0.2, gamma = 0.3) {
  const n = weekly.length;
  if (seasonLength < 2 || n < seasonLength * 2) {
    return smoothedForecast(weekly, horizon, alpha, beta);
  }

  const season1 = weekly.slice(0, seasonLength);
  const season2 = weekly.slice(seasonLength, seasonLength * 2);
  const avg1 = season1.reduce((a, b) => a + b, 0) / seasonLength;
  const avg2 = season2.reduce((a, b) => a + b, 0) / seasonLength;

  let level = avg1;
  let trend = (avg2 - avg1) / seasonLength;
  const seasonal = season1.map((v) => v - avg1);

  let sse = 0, count = 0;
  for (let i = 0; i < n; i++) {
    const s = seasonal[i % seasonLength];
    const actual = weekly[i];
    if (i >= seasonLength) {
      sse += (actual - (level + trend + s)) ** 2;
      count++;
    }
    const prevLevel = level;
    level = alpha * (actual - s) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[i % seasonLength] = gamma * (actual - level) + (1 - gamma) * s;
  }
  const rmse = count > 0 ? Math.sqrt(sse / count) : 0;

  const raw = Array.from({ length: horizon }, (_, i) => {
    const h = i + 1;
    const s = seasonal[(n + i) % seasonLength];
    return level + h * trend + s;
  });
  return { forecast: clampForecast(raw, rmse), rmse, slope: trend };
}

/**
 * ML (neural network) forecast.
 * Trains a small feedforward network per product on its weekly sales history.
 * Learns non-linear patterns that math models miss.
 */
export function mlForecastWrapper(weekly, horizon = HORIZON, productId = "default") {
  const n = weekly.length;
  if (n < 5) {
    return { ...linearForecast(weekly, horizon), method: "linear (fallback: <5 weeks for ML)" };
  }
  return mlForecast(weekly, horizon, productId);
}

export function computeForecast(weekly, horizon, method, seasonLength, productId) {
  if (method === "seasonal") return seasonalForecast(weekly, horizon, seasonLength);
  if (method === "smoothed") return smoothedForecast(weekly, horizon);
  if (method === "ml") return mlForecastWrapper(weekly, horizon, productId);
  return linearForecast(weekly, horizon);
}

/**
 * @param {object} product - { id, stock, leadTimeDays, safetyStock, unitCost }
 * @param {number[]} weekly - chronological weekly units-sold history
 * @param {object} [options] - { method: 'linear'|'smoothed'|'seasonal'|'ml', seasonLength: number }
 */
export function productMetrics(product, weekly, options = {}) {
  const method = options.method || "linear";
  const seasonLength = options.seasonLength || 4;
  const productId = product.id || "default";

  const recent = weekly.slice(-4);
  const avgWeekly = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const avgDaily = avgWeekly / 7;

  const result = computeForecast(weekly, HORIZON, method, seasonLength, productId);
  const { slope, forecast, rmse } = result;

  let usedMethod = method;
  if (method === "seasonal" && weekly.length < seasonLength * 2) {
    usedMethod = "smoothed (not enough history for seasonal)";
  } else if (method === "ml" && weekly.length < 5) {
    usedMethod = "linear (fallback: <5 weeks for ML)";
  } else if (method === "ml" && forecast.every((f) => f.value === 0)) {
    usedMethod = "linear (fallback: ML training failed)";
  }

  const reorderPoint = Math.round(avgDaily * product.leadTimeDays + product.safetyStock);
  const daysOfStock = avgDaily > 0 ? product.stock / avgDaily : Infinity;
  const demandNext6 = forecast.reduce((a, f) => a + f.value, 0);
  const suggestedOrder = Math.max(0, Math.round(demandNext6 + product.safetyStock - product.stock));

  let status = "ok";
  if (product.stock <= 0) status = "out";
  else if (Number.isFinite(daysOfStock) && daysOfStock <= product.leadTimeDays) status = "critical";
  else if (product.stock <= reorderPoint) status = "reorder";

  return {
    avgWeekly, avgDaily, slope, forecast, rmse, method: usedMethod,
    reorderPoint, daysOfStock, demandNext6, suggestedOrder, status,
  };
}

/**
 * Standard inventory-theory safety stock calculation.
 * Converts the model's weekly RMSE to a daily standard deviation and
 * scales by √leadTimeDays.
 *
 * @param {number} rmseWeekly - Root mean squared error of weekly forecast
 * @param {number} leadTimeDays - Supplier lead time in days
 * @param {number} [z=1.65] - Service-level factor (95% service level)
 * @returns {number} Recommended safety stock (rounded, never negative)
 */
export function calculateSafetyStock(rmseWeekly, leadTimeDays, z = 1.65) {
  const sigmaDaily = rmseWeekly / Math.sqrt(7);
  return Math.max(0, Math.round(z * sigmaDaily * Math.sqrt(leadTimeDays)));
}

let mlTrainingQueued = false;

/**
 * Queue training of ML models for all products. Called from the server
 * when settings change to "ml", so models are ready immediately.
 */
export function trainAllProducts(getAllProductsCallback) {
  if (mlTrainingQueued) return;
  mlTrainingQueued = true;

  setImmediate(() => {
    try {
      const products = getAllProductsCallback();
      let trained = 0;
      for (const p of products) {
        const weekly = p.weekly || [];
        if (weekly.length >= 5) {
          trainProduct(p.id, weekly);
          trained++;
        }
      }
      saveModels();
      console.log(`ML: trained ${trained}/${products.length} product models.`);
    } catch (err) {
      console.error("ML batch training error:", err.message);
    }
    mlTrainingQueued = false;
  });
}
