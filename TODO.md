# Quantity-per-unit feature — TODO

1. [x] `server/src/db.js`: Add `qty_per_unit` + `qty_unit_label` columns to `products` + startup migration for existing DBs
2. [x] `server/src/routes/products.js`: `toProductShape` returns `qtyPerUnit`, `qtyUnitLabel`, computed `displayName`; POST/PUT store new fields; sales-history query returns display name
3. [x] `server/src/routes/orders.js`: product joins include display name for order list/history
4. [x] `server/src/seed.js`: update sample products with qty per unit (Wimbi Flour 50 kg, Jerrican 20 litres, Kitenge 6 yards, Cement 50 kg; single-unit for electronics/baskets)
5. [x] `client/src/components/Modals.jsx`: add optional "qty per unit + unit label" inputs to ProductModal
6. [x] Client components: render `displayName` fallback to `name` — Inventory, Dashboard, Forecast, Alerts, Sales, PurchaseOrderModal, SalesHistory, OrderHistory
7. [x] Build client, verify, commit and push

