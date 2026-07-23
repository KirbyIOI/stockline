path = r"C:\Users\krypt\Downloads\niz\stockline\client\src\components\OrderHistory.jsx"

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: CreateOrderModal closing divs - 2 places: in CreateOrderModal AND ReceiveModal
# Both have the same pattern of 2 missing indent levels
# "        </div>\n    </div>\n  )\n}" should be "        </div>\n      </div>\n    </div>\n  )\n}"

# Fix CreateOrderModal (first occurrence)
old1 = '''        </div>
  )
}

function ReceiveModal'''
new1 = '''        </div>
    </div>
  )
}

function ReceiveModal'''
text = text.replace(old1, new1, 1)

# Fix ReceiveModal (second occurrence)
old2 = '''        </div>
  )
}

export default function'''
new2 = '''        </div>
    </div>
  )
}

export default function'''
text = text.replace(old2, new2, 1)

# Fix 2: Stat cards - 4 stat cards with missing </div> closings
old_stats = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''

new_stats = '''          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{orders.length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Open</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === "open").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.teal }}>{orders.filter((o) => o.status === "received").length}</div>
        <div style={{ background: COLORS.panel, border: "1px solid " + COLORS.line, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 120 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Cancelled</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.rose }}>{orders.filter((o) => o.status === "cancelled").length}</div>'''

text = text.replace(old_stats, new_stats, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Fixed")
