with open('client/src/components/OrderHistory.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix stat cards - each <div> wrapper needs a closing </div>
# The stat cards section:
# <div style={{ display: "flex", gap: 14... }}>
#   <div style={...}>  <- card 1
#     <div>Total</div>
#     <div>{orders.length}</div>
#   </div>              <- missing
#   <div style={...}>  <- card 2
#     ...
#   </div>
# ... etc

# Replace the stat cards section pattern
old = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''

new = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''

count = text.count(old)
print(f"Found {count} occurrences")

if count > 0:
    text = text.replace(old, new)

with open('client/src/components/OrderHistory.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Stat cards fixed')
