import re

path = r"C:\Users\krypt\Downloads\niz\stockline\client\src\components\OrderHistory.jsx"

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: CreateOrderModal - fix the 2 missing closing divs and indentation
# Current pattern at end of CreateOrderModal (w/o proper closings):
# "        </div>\n    </div>\n  )\n}\n"
# Should be:
# "      </div>\n    </div>\n  )\n}\n"

# Look for: Place order button closing div section through to function ReceiveModal
old1 = '''          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
  )
}

function ReceiveModal'''

new1 = '''          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
    </div>
  )
}

function ReceiveModal'''

if old1 in text:
    text = text.replace(old1, new1, 1)
    print("Fix 1 applied (CreateOrderModal)")
else:
    print("Fix 1 NOT FOUND")

# Fix 2: ReceiveModal - same pattern
old2 = '''          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
  )
}

export default function'''

new2 = '''          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
    </div>
  )
}

export default function'''

if old2 in text:
    text = text.replace(old2, new2, 1)
    print("Fix 2 applied (ReceiveModal)")
else:
    print("Fix 2 NOT FOUND")

# Fix 3: Stat cards - fix closing divs
old3 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''

new3 = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''

if old3 in text:
    text = text.replace(old3, new3, 1)
    print("Fix 3 applied (stat cards)")
else:
    print("Fix 3 NOT FOUND")
    # Debug: show the exact text around that area
    idx = text.find("Space Grotesk',sans-serif")
    if idx >= 0:
        print("Found area around stat cards, showing 400 chars:")
        print(repr(text[idx-50:idx+500]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Write complete")
