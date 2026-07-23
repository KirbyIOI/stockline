# Fix all JSX structural issues in OrderHistory.jsx
content = open('client/src/components/OrderHistory.jsx', 'r', encoding='utf-8').read()

# Fix 1: Close CreateOrderModal's overlay div properly
old1 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
  )
}'''

new1 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
    </div>
  )
}'''

content = content.replace(old1, new1)

# Fix 2: Close ReceiveModal's overlay div properly
old2 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
  )
}'''

new2 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
    </div>
  )
}'''

content = content.replace(old2, new2)

# Fix 3: Close stat card divs - add </div> before each new card div
# First card (Total) -> (Open)
old3 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>'''
new3 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>'''
content = content.replace(old3, new3)

# Second card (Open) -> (Received)
old4 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>'''
new4 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>'''
content = content.replace(old4, new4)

# Third card (Received) -> (Cancelled)
old5 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>'''
new5 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>'''
content = content.replace(old5, new5)

# Fourth card (Cancelled) - close it and close the outer flex div
old6 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''
new6 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>
      </div>'''
content = content.replace(old6, new6)

open('client/src/components/OrderHistory.jsx', 'w', encoding='utf-8').write(content)
print('All done')
