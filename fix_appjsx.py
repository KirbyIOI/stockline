# Fix duplicate state and duplicate Alerts props in App.jsx
content = open('client/src/App.jsx', 'r', encoding='utf-8').read()

# Fix 1: Remove duplicate state declaration
old_state = (
    '  const [orders, setOrders] = useState({}); // productId -> { orderId, qty, placedOn }\n'
    '  const [alertOrdered, setAlertOrdered] = useState({}); // productId -> { ordered: true }\n'
    '  const [alertOrdered, setAlertOrdered] = useState({}); // productId -> { ordered: true }'
)
new_state = (
    '  const [orders, setOrders] = useState({}); // productId -> { orderId, qty, placedOn }\n'
    '  const [alertOrdered, setAlertOrdered] = useState({}); // productId -> { ordered: true }'
)
content = content.replace(old_state, new_state)

# Fix 2: Remove duplicate Alerts props
old_alerts = (
    '          <Alerts\n'
    '            products={products} needsAttention={needsAttention} metrics={metrics} orders={orders}\n'
    '            onSelectProduct={(id) => { setSelectedId(id); setView("forecast"); }}\n'
    '            onPlaceOrder={placeOrder} onCancelOrder={cancelOrder}\n'
    '            onReceive={(p) => setReceiveFor(p)}\n'
    '            alertOrdered={alertOrdered} onAlertMarkOrdered={(id) => setAlertOrdered((a) => ({ ...a, [id]: { ordered: true } }))}\n'
    '            onAlertReceive={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n'
    '            onAlertCancel={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n'
    '            alertOrdered={alertOrdered} onAlertMarkOrdered={(id) => setAlertOrdered((a) => ({ ...a, [id]: { ordered: true } }))}\n'
    '            onAlertReceive={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n'
    '            onAlertCancel={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n'
    '          />'
)
new_alerts = (
    '          <Alerts\n'
    '            products={products} needsAttention={needsAttention} metrics={metrics} orders={orders}\n'
    '            onSelectProduct={(id) => { setSelectedId(id); setView("forecast"); }}\n'
    '            onPlaceOrder={placeOrder} onCancelOrder={cancelOrder}\n'
    '            onReceive={(p) => setReceiveFor(p)}\n'
    '            alertOrdered={alertOrdered} onAlertMarkOrdered={(id) => setAlertOrdered((a) => ({ ...a, [id]: { ordered: true } }))}\n'
    '            onAlertReceive={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n'
    '            onAlertCancel={(id) => setAlertOrdered((a) => { const n = { ...a }; delete n[id]; return n; })}\n'
    '          />'
)
content = content.replace(old_alerts, new_alerts)

open('client/src/App.jsx', 'w', encoding='utf-8').write(content)
print('Fixed successfully')
