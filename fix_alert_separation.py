import re

# ===== 1. Modify App.jsx =====
with open('client/src/App.jsx','r',encoding='utf-8') as f:
    app = f.read()

# Fix 1: Add alertOrdered state next to orders
app = app.replace(
    "  const [orders, setOrders] = useState({}); // productId -> { orderId, qty, placedOn }",
    "  const [orders, setOrders] = useState({}); // productId -> { orderId, qty, placedOn }\n  const [alertOrdered, setAlertOrdered] = useState({}); // productId -> { ordered: true }"
)

# Fix 2: Add alertOrdered to Alerts props
app = app.replace(
    '          onPlaceOrder={placeOrder} onCancelOrder={cancelOrder}\n            onReceive={(p) => setReceiveFor(p)}',
    '          onPlaceOrder={placeOrder} onCancelOrder={cancelOrder}\n            onReceive={(p) => setReceiveFor(p)}\n            alertOrdered={alertOrdered} onAlertMarkOrdered={(id) => setAlertOrdered((a) => ({ ...a, [id]: { ordered: true } }))}\n            onAlertReceive={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n            onAlertCancel={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}'
)

with open('client/src/App.jsx','w',encoding='utf-8') as f:
    f.write(app)
print('App.jsx updated')

# ===== 2. Modify Alerts.jsx =====
with open('client/src/components/Alerts.jsx','r',encoding='utf-8') as f:
    alerts = f.read()

# Fix: Update function signature to accept new props
alerts = alerts.replace(
    'export default function Alerts({ products, needsAttention, metrics, orders, onSelectProduct, onPlaceOrder, onCancelOrder, onReceive }) {',
    'export default function Alerts({ products, needsAttention, metrics, orders, onSelectProduct, onPlaceOrder, onCancelOrder, onReceive, alertOrdered = {}, onAlertMarkOrdered, onAlertReceive, onAlertCancel }) {'
)

# Fix the orderedIds to include both real orders AND alert-ordered items
alerts = alerts.replace(
    "  const orderedIds = Object.keys(orders);",
    "  const orderedIds = [...new Set([...Object.keys(orders), ...Object.keys(alertOrdered)])];"
)

# Fix pool filter for 'ordered' tab
old_pool = '  const pool = filter === "ordered"\n    ? products.filter((p) => orderedIds.includes(p.id))\n    : needsAttention.filter((p) => filter === "all" || metrics[p.id].status === filter);'
new_pool = '  const pool = filter === "ordered"\n    ? products.filter((p) => orderedIds.includes(p.id))\n    : (filter === "all" ? needsAttention : needsAttention.filter((p) => metrics[p.id].status === filter));'
alerts = alerts.replace(old_pool, new_pool)

# Fix order badge display
old_badge = '                      {(order || alertOrdered[p.id]) && (\n                        <span style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, color: COLORS.teal, background: COLORS.tealSoft, padding: "2px 8px", borderRadius: 20 }}>\n                          On order · {order ? order.qty + \' units\' : \'Awaiting\'}\n                        </span>\n                      )}'

# First replace the old block with a placeholder
old_badge_old = """                      {order && (
                        <span style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, color: COLORS.teal, background: COLORS.tealSoft, padding: "2px 8px", borderRadius: 20 }}>
                          On order · {order.qty} units
                        </span>
                      )}"""
new_badge_new = """                      {(order || alertOrdered[p.id]) && (
                        <span style={{ fontFamily: "Inter", fontSize: 10.5, fontWeight: 600, color: COLORS.teal, background: COLORS.tealSoft, padding: "2px 8px", borderRadius: 20 }}>
                          On order · {order ? order.qty + ' units' : 'Awaiting'}
                        </span>
                      )}"""
alerts = alerts.replace(old_badge_old, new_badge_new)

# Fix action buttons
old_actions = """                    {order ? (
                      <>
                        <button onClick={() => onReceive(p)} style={secondaryBtnStyle}>Receive</button>
                        <button onClick={() => onCancelOrder(order.orderId)} style={iconBtnStyle} title="Cancel order"><X size={16} /></button>
                      </>
                    ) : (
                      <button onClick={() => onPlaceOrder(p.id, m.suggestedOrder)} style={secondaryBtnStyle}>Mark ordered</button>
                    )}"""
new_actions = """                    {(order || alertOrdered[p.id]) ? (
                      <>
                        <button onClick={() => order ? onReceive(p) : onAlertReceive(p.id)} style={secondaryBtnStyle}>Receive</button>
                        <button onClick={() => order ? onCancelOrder(order.orderId) : onAlertCancel(p.id)} style={{...iconBtnStyle, color: COLORS.rose}} title={order ? 'Cancel order' : 'Cancel alert order'}><X size={16} /></button>
                      </>
                    ) : (
                      <button onClick={() => onAlertMarkOrdered ? onAlertMarkOrdered(p.id) : onPlaceOrder(p.id, m.suggestedOrder)} style={secondaryBtnStyle}>Mark ordered</button>
                    )}"""
alerts = alerts.replace(old_actions, new_actions)

with open('client/src/components/Alerts.jsx','w',encoding='utf-8') as f:
    f.write(alerts)
print('Alerts.jsx updated')
