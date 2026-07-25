/**
 * ML-based sales forecasting using a lightweight neural network.
 * 
 * Each product gets a small feedforward network trained on its
 * weekly sales history. The network learns non-linear patterns that
 * simple math models (linear regression, exponential smoothing) miss.
 * 
 * Pure JavaScript implementation — zero native dependencies.
 * Training is fast (~milliseconds per product) and happens in-memory.
 * Model state can be serialized to disk for persistence across restarts.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_PATH = process.env.ML_MODELS_PATH || path.join(__dirname, "../data/ml_models.json");

// Cache of trained networks per product
const networks = {};

// ---------- Minimal Neural Network (pure JS) ----------

/**
 * A simple feedforward neural network with one hidden layer.
 * No external dependencies — uses only vanilla JS.
 */
class SimpleNN {
  /**
   * @param {object} options
   * @param {number} options.inputSize
   * @param {number} options.hiddenSize
   * @param {number} options.outputSize
   * @param {number} options.learningRate
   * @param {number} options.iterations
   */
  constructor(options = {}) {
    this.inputSize = options.inputSize || 4;
    this.hiddenSize = options.hiddenSize || 6;
    this.outputSize = options.outputSize || 1;
    this.learningRate = options.learningRate || 0.01;
    this.iterations = options.iterations || 1000;

    // Initialize weights and biases with small random values
    this.w1 = this._randn(this.inputSize, this.hiddenSize);
    this.b1 = this._zeros(1, this.hiddenSize);
    this.w2 = this._randn(this.hiddenSize, this.outputSize);
    this.b2 = this._zeros(1, this.outputSize);
  }

  _randn(rows, cols) {
    // Box-Muller transform for normal distribution
    const m = [];
    for (let r = 0; r < rows; r++) {
      m[r] = [];
      for (let c = 0; c < cols; c++) {
        const u1 = Math.random();
        const u2 = Math.random();
        m[r][c] = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2) * 0.1;
      }
    }
    return m;
  }

  _zeros(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  _matMul(a, b) {
    const result = Array.from({ length: a.length }, () => Array(b[0].length).fill(0));
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b[0].length; j++) {
        for (let k = 0; k < a[0].length; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  _matAdd(a, b) {
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a[i].length; j++) {
        a[i][j] += b[i][j];
      }
    }
    return a;
  }

  _sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  _sigmoidPrime(x) {
    return x * (1 - x);
  }

  _activate(m) {
    return m.map(row => row.map(v => this._sigmoid(v)));
  }

  _activatePrime(m) {
    return m.map(row => row.map(v => this._sigmoidPrime(v)));
  }

  _transpose(m) {
    return m[0].map((_, colIdx) => m.map(row => row[colIdx]));
  }

  _scale(m, s) {
    return m.map(row => row.map(v => v * s));
  }

  _subtract(a, b) {
    return a.map((row, i) => row.map((v, j) => v - b[i][j]));
  }

  /**
   * Forward pass through the network.
   * Returns [hiddenOutput, finalOutput]
   */
  forward(input) {
    // Input is a 2D matrix (1 x inputSize)
    const z1 = this._matAdd(this._matMul(input, this.w1), this.b1);
    const a1 = this._activate(z1);
    const z2 = this._matAdd(this._matMul(a1, this.w2), this.b2);
    const a2 = this._activate(z2);
    return [a1, a2];
  }

  /**
   * Train on one sample (input, expectedOutput).
   */
  train(input, expected) {
    // Ensure 2D
    const inp = Array.isArray(input[0]) ? input : [input];
    const exp = Array.isArray(expected[0]) ? expected : [expected];

    // Forward pass
    const [a1, a2] = this.forward(inp);

    // Backpropagation
    const outputError = this._subtract(a2, exp);
    const outputDelta = this._scale(outputError, this.learningRate);

    const hiddenError = this._matMul(outputError, this._transpose(this.w2));
    const hiddenDelta = this._scale(this._multiplyElementwise(hiddenError, a1.map(r => r.map(v => v * (1 - v)))), this.learningRate);

    // Gradient descent
    this.w2 = this._subtract(this.w2, this._scale(this._matMul(this._transpose(a1), outputDelta), 1));
    this.b2 = this._subtract(this.b2, this._scale(outputDelta, 1));
    this.w1 = this._subtract(this.w1, this._scale(this._matMul(this._transpose(inp), hiddenDelta), 1));
    this.b1 = this._subtract(this.b1, this._scale(hiddenDelta, 1));
  }

  _multiplyElementwise(a, b) {
    return a.map((row, i) => row.map((v, j) => v * b[i][j]));
  }

  /**
   * Full training on a dataset.
   * @param {Array<{input: number[], output: number[]}>} data
   */
  trainOnData(data) {
    for (let iter = 0; iter < this.iterations; iter++) {
      // Shuffle data each epoch
      for (let i = data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [data[i], data[j]] = [data[j], data[i]];
      }
      for (const sample of data) {
        const inp = [sample.input];
        const exp = [sample.output];
        this.train(inp, exp);
      }
    }
  }

  /**
   * Run the network on an input and return the output.
   */
  run(input) {
    const inp = Array.isArray(input[0]) ? input : [input];
    const [, a2] = this.forward(inp);
    return a2[0];
  }

  /**
   * Serialize network to a plain object for JSON storage.
   */
  toJSON() {
    return {
      inputSize: this.inputSize,
      hiddenSize: this.hiddenSize,
      outputSize: this.outputSize,
      learningRate: this.learningRate,
      w1: this.w1,
      b1: this.b1,
      w2: this.w2,
      b2: this.b2,
    };
  }

  /**
   * Restore network from a serialized JSON object.
   */
  fromJSON(json) {
    this.inputSize = json.inputSize;
    this.hiddenSize = json.hiddenSize;
    this.outputSize = json.outputSize;
    this.learningRate = json.learningRate || 0.01;
    this.w1 = json.w1;
    this.b1 = json.b1;
    this.w2 = json.w2;
    this.b2 = json.b2;
  }
}

// ---------- Training & Prediction ----------

/**
 * Normalize a value relative to the max in a dataset.
 */
function normalize(val, max) {
  return max > 0 ? val / max : 0;
}

/**
 * Prepare training data from weekly sales history.
 * Uses a sliding window of lookBack weeks to predict the next week.
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
    networks[productId] = null;
    return null;
  }

  const net = new SimpleNN({
    inputSize: prepared.lookBack,
    hiddenSize: Math.min(8, Math.max(3, Math.floor(prepared.data.length / 2))),
    outputSize: 1,
    learningRate: 0.02,
    iterations: Math.min(1500, Math.max(300, prepared.data.length * 80)),
  });

  net.trainOnData(prepared.data);

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

  const forecast = [];
  let window = weekly.slice(-lookBack);

  for (let i = 0; i < horizon; i++) {
    const input = window.map((v) => normalize(v, maxVal));
    const output = net.run(input);
    const predicted = Math.round(output[0] * maxVal);
    forecast.push(predicted);

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
 * Load all serialized models from disk, rebuilding the neural networks.
 */
export function loadModels() {
  try {
    if (!fs.existsSync(MODELS_PATH)) return;
    const raw = fs.readFileSync(MODELS_PATH, "utf8");
    const serialized = JSON.parse(raw);
    for (const [productId, data] of Object.entries(serialized)) {
      const net = new SimpleNN();
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
