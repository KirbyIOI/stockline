import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { seed } from "./seed.js";
import { requireAuth, requireAdmin } from "./auth.js";
import { bootstrapAdmin } from "./users.js";
import { router as authRouter } from "./routes/auth.js";
import { router as usersRouter } from "./routes/users.js";
import { router as settingsRouter } from "./routes/settings.js";
import { router as productsRouter } from "./routes/products.js";
import { router as ordersRouter } from "./routes/orders.js";
import { router as dashboardRouter } from "./routes/dashboard.js";
import { router as assistantRouter, publicRouter as assistantPublicRouter } from "./routes/assistant.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

seed(); // populates sample data on first run only; no-ops if the DB already has products
bootstrapAdmin(); // creates the first admin account from .env if no users exist yet

const app = express();
app.set("trust proxy", 1); // needed for correct rate-limiting / client IPs behind Render, Railway, etc.

app.use(helmet({ contentSecurityPolicy: false })); // CSP left off: the client is a separate static build with its own headers
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

// General API rate limit — generous for normal use, just blunts abuse/scripted hammering.
app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter); // login is public; /me and /change-password guard themselves
app.use("/api/assistant", assistantPublicRouter); // /status only — safe to expose without auth

// Everything below requires a valid session token.
app.use("/api/assistant", requireAuth, assistantRouter);
app.use("/api/products", requireAuth, productsRouter);
app.use("/api/orders", requireAuth, ordersRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/settings", requireAuth, settingsRouter); // GET is for any user, PUT checks requireAdmin itself
app.use("/api/users", requireAuth, requireAdmin, usersRouter); // whole router is admin-only

// In production, optionally serve the built React app from the same service —
// this lets you deploy the whole thing as a single web service on a free host
// instead of standing up a separate static site. Harmless if the folder is absent.
const clientDist = process.env.CLIENT_DIST_PATH || path.join(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
  console.log(`Serving built frontend from ${clientDist}`);
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Stockline API listening on http://localhost:${PORT}`));
