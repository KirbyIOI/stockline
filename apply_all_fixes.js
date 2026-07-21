const fs = require('fs');
const path = require('path');
const BASE = 'C:/Users/krypt/Downloads/niz/stockline';

// ===== HELPER: base64 encode file content to avoid content filter stripping tags =====
function writeFile(relativePath, content) {
  const fullPath = path.join(BASE, relativePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Written:', relativePath);
}

// ===== 1. sales.js (backend route) =====
writeFile('server/src/routes/sales.js', `import { Router } from "express";
import { db } from "../db.js";

export const router = Router();

// GET /api/sales-history — returns every recorded sale with product details
router.get("/", (req, res) => {
  const rows = db.prepare(\`
    SELECT
      ws.id,
      ws.product_id AS productId,
      p.name AS productName,
      p.sku AS productSku,
      p.price AS unitPrice,
      ws.units,
      ws.week_index AS weekIndex,
      ws.recorded_at AS recordedAt
    FROM weekly_sales ws
    JOIN products p ON p.id = ws.product_id
    ORDER BY ws.recorded_at DESC, ws.week_index DESC
  \`).all();

  res.json(rows.map(r => ({
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    productSku: r.productSku,
    units: r.units,
    unitPrice: r.unitPrice,
    totalValue: r.units * r.unitPrice,
    weekIndex: r.weekIndex,
    recordedAt: r.recordedAt,
  })));
});
`);

// ===== 2. Update server/src/index.js to add sales route =====
let indexContent = fs.readFileSync(path.join(BASE, 'server/src/index.js'), 'utf8');
if (!indexContent.includes('salesRouter')) {
  indexContent = indexContent.replace(
    `import { router as settingsRouter } from "./routes/settings.js";`,
    `import { router as settingsRouter } from "./routes/settings.js";\nimport { router as salesRouter } from "./routes/sales.js";`
  );
  indexContent = indexContent.replace(
    `app.use("/api/dashboard", requireAuth, dashboardRouter);`,
    `app.use("/api/dashboard", requireAuth, dashboardRouter);\napp.use("/api/sales-history", requireAuth, salesRouter);`
  );
  indexContent = indexContent.replace(
    `app.use("/api/settings", requireAuth, settingsRouter);`,
    `app.use("/api/settings", requireAuth, settingsRouter);`
  );
  // Fix: the current server code is different from what the edit_file showed
  writeFile('server/src/index.js', indexContent);
  console.log('Updated server/src/index.js');
} else {
  console.log('server/src/index.js already updated');
}

// ===== 3. Update orders.js to include productName/productSku =====
let ordersContent = fs.readFileSync(path.join(BASE, 'server/src/routes/orders.js'), 'utf8');
if (!ordersContent.includes('productName')) {
  ordersContent = ordersContent.replace(
    `// GET /api/orders?status=open — list purchase orders, optionally filtered by status\nrouter.get("/", (req, res) => {\n  const { status } = req.query;\n  const rows = status\n    ? db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY placed_at DESC").all(status)\n    : db.prepare("SELECT * FROM orders ORDER BY placed_at DESC").all();\n  res.json(rows.map(toOrderShape));\n});`,
    `// GET /api/orders?status=open — list purchase orders, optionally filtered by status.\n// Returns product name and SKU alongside each order for display purposes.\nrouter.get("/", (req, res) => {\n  const { status } = req.query;\n  const sql = status\n    ? \`SELECT o.*, p.name AS productName, p.sku AS productSku\n       FROM orders o\n       JOIN products p ON p.id = o.product_id\n       WHERE o.status = ?\n       ORDER BY o.placed_at DESC\`\n    : \`SELECT o.*, p.name AS productName, p.sku AS productSku\n       FROM orders o\n       JOIN products p ON p.id = o.product_id\n       ORDER BY o.placed_at DESC\`;\n  const rows = status\n    ? db.prepare(sql).all(status)\n    : db.prepare(sql).all();\n  const shaped = rows.map((row) => ({\n    ...toOrderShape(row),\n    productName: row.productName,\n    productSku: row.productSku,\n  }));\n  res.json(shaped);\n});`
  );
  writeFile('server/src/routes/orders.js', ordersContent);
  console.log('Updated orders.js');
} else {
  console.log('orders.js already updated');
}

// ===== 4. Update api.js =====
let apiContent = fs.readFileSync(path.join(BASE, 'client/src/api.js'), 'utf8');
if (!apiContent.includes('salesHistory')) {
  apiContent = apiContent.replace(
    `getAssistantStatus: () => request("/assistant/status", {}, { auth: false }),`,
    `salesHistory: () => request("/sales-history"),\n\n  getAssistantStatus: () => request("/assistant/status", {}, { auth: false }),`
  );
  writeFile('client/src/api.js', apiContent);
  console.log('Updated api.js');
} else {
  console.log('api.js already updated');
}

// ===== 5. Update App.jsx =====
let appContent = fs.readFileSync(path.join(BASE, 'client/src/App.jsx'), 'utf8');
if (!appContent.includes('SalesHistory')) {
  // Add imports
  appContent = appContent.replace(
    `import Settings from "./components/Settings.jsx";`,
    `import Settings from "./components/Settings.jsx";\nimport SalesHistory from "./components/SalesHistory.jsx";\nimport OrderHistory from "./components/OrderHistory.jsx";`
  );
  // Add icons to import
  appContent = appContent.replace(
    `import { LayoutDashboard, Boxes, TrendingUp, AlertTriangle, LogOut, Menu, X, Settings as SettingsIcon, ShieldCheck, User as UserIcon } from "lucide-react";`,
    `import { LayoutDashboard, Boxes, TrendingUp, AlertTriangle, LogOut, Menu, X, Settings as SettingsIcon, ShieldCheck, User as UserIcon, ShoppingCart, Package } from "lucide-react";`
  );
  // Add nav items
  appContent = appContent.replace(
    `{ id: "alerts", label: "Alerts", icon: AlertTriangle },`,
    `{ id: "sales-history", label: "Sales History", icon: ShoppingCart },\n  { id: "order-history", label: "Purchase Orders", icon: Package },\n  { id: "alerts", label: "Alerts", icon: AlertTriangle },`
  );
  // Add view rendering
  appContent = appContent.replace(
    `{view === "settings" && (<Settings`,
    `{view === "sales-history" && <SalesHistory />}\n        {view === "order-history" && <OrderHistory />}\n        {view === "settings" && (<Settings`
  );
  writeFile('client/src/App.jsx', appContent);
  console.log('Updated App.jsx');
} else {
  console.log('App.jsx already updated');
}

console.log('\\n=== All done! ===');
