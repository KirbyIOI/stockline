/**
 * ML-based sales forecasting using brain.js neural networks.
 * 
 * Each product gets a small feedforward neural network trained on its
 * weekly sales history. The network learns non-linear patterns that
 * simple math models (linear regression, exponential smoothing) miss.
 * 
 * Training is fast (~milliseconds per product) and happens in-memory.
 * Model state can be serialized to disk for persistence across restarts.
 */

import brain from "brain.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_PATH = process.env.ML_MODELS_PATH || path.join(__dirname, "../data/ml_models.json");

// Cache of trained networks per product
const networks = {};

/**
 * Normalize a value relative to the max in a dataset.
 */
function normalize(val, max) {
  return max > 0 ? val / max : 0;
}

/**
 * Prepare training data from weekly sales history.
 * Uses a sliding window of lookBack weeks to predict the next week.
 * Returns { trainingData, maxVal, lookBack }
 */
function prepareTrainingData(weekly, lookBack = 4) {
  if (weekly.length < lookBack + 1) return null;

  const maxVal = Math.max(...weekly, 1);
  const data = [];

  for (let i = lookBack; i < weekly.length; i++) {
    const input = weekly.slice(i - lookBack, i).map((v) => normalize(v, maxVal));
    const output = [normalize(weekly[i], maxVal)];
    data.push({ input, output });
  }

  return { data, maxVal, lookBack };
}

/**
 * Train a neural network for a specific product using its weekly sales history.
 * Returns the trained network and metadata.
 */
export function trainProduct(productId, weekly, lookBack = 4) {
  const prepared = prepareTrainingData(weekly, lookBack);
  if (!prepared || prepared.data.length < 2) {
    // Not enough data to train — return null so caller falls back to math
    networks[productId] = null;
    return null;
  }

  // Create a small feedforward network
  // Architecture: input layer (lookBack neurons) -> hidden layer (8 neurons) -> output layer (1 neuron)
  const net = new brain.NeuralNetwork({
    activation: "leaky-relu", // Good for positive regression outputs
    hiddenLayers: [Math.min(8, prepared.data.length)], // Shrink hidden layer for small datasets
    learningRate: 0.01,
    iterations: Math.min(2000, Math.max(500, prepared.data.length * 100)),
    errorThresh: 0.005,
  });

  net.train(prepared.data, {
    log: false,
    logPeriod: 100,
  });

  networks[productId] = { net, maxVal: prepared.maxVal, lookBack: prepared.lookBack, trainedOn: weekly.length };
  return networks[productId];
}

/**
 * Predict the next `horizon` weeks for a product using its trained network.
 * Falls back to null if no trained network exists.
 */
export function predict(productId, weekly, horizon = 6) {
  const model = networks[productId];
  if (!model) return null;

  const { net, maxVal, lookBack } = model;

  // Start with the most recent `lookBack` actual values
  const forecast = [];
  let window = weekly.slice(-lookBack);

  for (let i = 0; i < horizon; i++) {
    const input = window.map((v) => normalize(v, maxVal));
    const output = net.run(input);
    const predicted = Math.round(output[0] * maxVal);
    forecast.push(predicted);

    // Slide the window: add prediction, remove oldest
    window = [...window.slice(1), predicted];
  }

  return forecast;
}

/**
 * Serialize all trained models to disk as JSON.
 */
export function saveModels() {
  const serialized = {};
  for (const [productId, model] of Object.entries(networks)) {
    if (model) {
      serialized[productId] = {
        json: model.net.toJSON(),
        maxVal: model.maxVal,
        lookBack: model.lookBack,
        trainedOn: model.trainedOn,
      };
    }
  }
  try {
    const dir = path.dirname(MODELS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MODELS_PATH, JSON.stringify(serialized));
  } catch (err) {
    console.error("Failed to save ML models:", err.message);
  }
}

/**
 * Load all serialized models from disk, rebuilding the brain.js networks.
 */
export function loadModels() {
  try {
    if (!fs.existsSync(MODELS_PATH)) return;
    const raw = fs.readFileSync(MODELS_PATH, "utf8");
    const serialized = JSON.parse(raw);
    for (const [productId, data] of Object.entries(serialized)) {
      const net = new brain.NeuralNetwork();
      net.fromJSON(data.json);
      networks[productId] = {
        net,
        maxVal: data.maxVal,
        lookBack: data.lookBack,
        trainedOn: data.trainedOn,
      };
    }
    console.log(`Loaded ${Object.keys(serialized).length} ML models from disk.`);
  } catch (err) {
    console.error("Failed to load ML models:", err.message);
  }
}

/**
 * Compute forecasting metrics using ML (neural network) predictions.
 * Returns the same shape as the math-based forecast functions so it's
 * a drop-in replacement.
 */
export function mlForecast(weekly, horizon = 6, productId = "default") {
  const n = weekly.length;
  if (n === 0) {
    return {
      forecast: Array.from({ length: horizon }, () => ({ value: 0, low: 0, high: 0 })),
      rmse: 0,
      slope: 0,
    };
  }

  // Train if not already trained for this product
  if (!networks[productId]) {
    trainProduct(productId, weekly);
  }

  const predictions = predict(productId, weekly, horizon);
  if (!predictions) {
    // Fallback: if ML can't train, return empty forecast
    return {
      forecast: Array.from({ length: horizon }, () => ({ value: 0, low: 0, high: 0 })),
      rmse: 0,
      slope: 0,
    };
  }

  // Calculate RMSE on the training data (in-sample error)
  const model = networks[productId];
  const lookBack = model?.lookBack || 4;
  let sse = 0;
  let count = 0;
  for (let i = lookBack; i < n; i++) {
    const input = weekly.slice(i - lookBack, i).map((v) => normalize(v, model?.maxVal || 1));
    const predicted = (model?.net.run(input)[0] || 0) * (model?.maxVal || 1);
    sse += (weekly[i] - predicted) ** 2;
    count++;
  }
  const rmse = count > 0 ? Math.sqrt(sse / count) : 0;

  // Estimate slope as the difference between first and last prediction
  const slope = predictions.length > 1 ? (predictions[predictions.length - 1] - predictions[0]) / predictions.length : 0;

  return {
    forecast: predictions.map((val) => ({
      value: Math.round(Math.max(0, val)),
      low: Math.round(Math.max(0, val - rmse)),
      high: Math.round(Math.max(0, val + rmse)),
    })),
    rmse,
    slope,
  };
}

// Load models on module import
loadModels();

// Autosave models periodically (every 5 minutes)
setInterval(saveModels, 5 * 60 * 1000);
