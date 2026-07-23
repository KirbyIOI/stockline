import re

# ===== 1. Backend: db.js — add order_source column migration =====
with open('server/src/db.js','r',encoding='utf-8') as f:
    dbjs = f.read()

old_migration = '''try:
  db.exec("ALTER TABLE orders ADD COLUMN supplier_name TEXT NOT NULL DEFAULT '';")
except:
  # Column already exists — this is fine.'''

new_migration = '''try:
  db.exec("ALTER TABLE orders ADD COLUMN supplier_name TEXT NOT NULL DEFAULT '';")
except:
  pass
try:
  db.exec("ALTER TABLE orders ADD COLUMN order_source TEXT NOT NULL DEFAULT 'alert';")
except:
  pass'''

if 'order_source' not in dbjs:
    dbjs = dbjs.replace(old_migration, new_migration)
    with open('server/src/db.js','w',encoding='utf-8') as f:
        f.write(dbjs)
    print('db.js updated — added order_source column')
else:
    print('db.js already has order_source')

# ===== 2. Backend: routes/orders.js — add source to shape + mark manual =====
with open('server/src/routes/orders.js','r',encoding='utf-8') as f:
    orders = f.read()

# Add source field to toOrderShape
orders = orders.replace(
    'productSku: row.productSku || null,',
    'productSku: row.productSku || null,\n    source: row.order_source || \'alert\','
)

# Change INSERT to include order_source='manual'
orders = orders.replace(
    "db.prepare(\"INSERT INTO orders (id, product_id, qty, status, supplier_name) VALUES (?, ?, ?, 'open', ?)\").run(id, productId, Number(qty), String(supplierName || \"\"));",
    "db.prepare(\"INSERT INTO orders (id, product_id, qty, status, supplier_name, order_source) VALUES (?, ?, ?, 'open', ?, 'manual')\").run(id, productId, Number(qty), String(supplierName || \"\"));"
)

with open('server/src/routes/orders.js','w',encoding='utf-8') as f:
    f.write(orders)
print('orders.js updated — source field in shape + manual flag on CREATE')

# ===== 3. Frontend: OrderHistory.jsx — show Manual PO badge + exclusive Receive/Cancel =====
with open('client/src/components/OrderHistory.jsx','r',encoding='utf-8') as f:
    oh = f.read()

# Add source column to the table header (after Status)
oh = oh.replace(
    '<th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Status</th>',
    '<th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Source</th>\n              <th style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600, color: COLORS.sub, textAlign: "left", padding: "12px 16px", borderBottom: "1px solid " + COLORS.line }}>Status</th>'
)

# Add source cell after productSku and before Status in each row
oh = oh.replace(
    '<td style={{ fontFamily: "\'IBM Plex Mono\',monospace", fontSize: 12.5, color: COLORS.sub, padding: "12px 16px" }}>\n                  {o.productSku || "---"}\n                </td>\n                <td style={{ fontFamily: "Inter", fontSize: 13, padding: "12px 16px" }}>',
    '<td style={{ fontFamily: "\'IBM Plex Mono\',monospace", fontSize: 12.5, color: COLORS.sub, padding: "12px 16px" }}>\n                  {o.productSku || "---"}\n                </td>\n                <td style={{ fontFamily: "Inter", fontSize: 13, padding: "12px 16px" }}>'
)

# Add Source cell after supplier
oh = oh.replace(
    '<td style={{ fontFamily: "Inter", fontSize: 13, padding: "12px 16px" }}>\n                  {o.supplierName || <span style={{ color: COLORS.sub, fontStyle: "italic" }}>N/A</span>}\n                </td>\n                <td style={{ fontFamily: "\'IBM Plex Mono\',monospace", fontWeight: 600, padding: "12px 16px" }}>{o.qty}</td>',
    '<td style={{ fontFamily: "Inter", fontSize: 13, padding: "12px 16px" }}>\n                  {o.supplierName || <span style={{ color: COLORS.sub, fontStyle: "italic" }}>N/A</span>}\n                </td>\n                <td style={{ padding: "12px 16px" }}>\n                  {o.source === "manual" ? (\n                    <span style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: COLORS.primary, background: COLORS.primarySoft, padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>\n                      Manual PO\n                    </span>\n                  ) : (\n                    <span style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 600, color: COLORS.teal, background: COLORS.tealSoft, padding: "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>\n                      Alert\n                    </span>\n                  )}\n                </td>\n                <td style={{ fontFamily: "\'IBM Plex Mono\',monospace", fontWeight: 600, padding: "12px 16px" }}>{o.qty}</td>'
)

# Make Receive/Cancel only show for manual PO (source === 'manual')
oh = oh.replace(
    '{o.status === "open" ? (\n                    <div style={{ display: "flex", gap: 6 }}>\n                      <button onClick={() => setReceiveFor(o)} style={{\n                        ...secondaryBtnStyle, padding: "5px 10px", fontSize: 12,\n                      }}>\n                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>\n                          <PackageCheck size={13} /> Receive\n                        </span>\n                      </button>\n                      <button onClick={() => handleCancel(o.id)} style={{\n                        ...secondaryBtnStyle, padding: "5px 10px", fontSize: 12, color: COLORS.rose,\n                      }}>\n                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>\n                          <XCircle size={13} /> Cancel\n                        </span>\n                      </button>\n                    </div>',
    '{o.status === "open" ? (\n                    <div style={{ display: "flex", gap: 6 }}>\n                      {o.source === "manual" ? (\n                        <>\n                          <button onClick={() => setReceiveFor(o)} style={{\n                            ...secondaryBtnStyle, padding: "5px 10px", fontSize: 12,\n                          }}>\n                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>\n                              <PackageCheck size={13} /> Receive\n                            </span>\n                          </button>\n                          <button onClick={() => handleCancel(o.id)} style={{\n                            ...secondaryBtnStyle, padding: "5px 10px", fontSize: 12, color: COLORS.rose,\n                          }}>\n                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>\n                              <XCircle size={13} /> Cancel\n                            </span>\n                          </button>\n                        </>\n                      ) : (\n                        <span style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, fontStyle: "italic" }}>Alert-generated — confirm in Alerts</span>\n                      )}\n                    </div>'
)

with open('client/src/components/OrderHistory.jsx','w',encoding='utf-8') as f:
    f.write(oh)
print('OrderHistory.jsx updated — Source badge + exclusive actions')

print('\n=== All changes applied ===')
