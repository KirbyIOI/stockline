path = r"C:\Users\krypt\Downloads\niz\stockline\client\src\components\OrderHistory.jsx"

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix CreateOrderModal closing 
# Find "        </div>\n    </div>\n  )\n}\n" that's for CreateOrderModal
# and change to "      </div>\n    </div>\n  )\n}\n"
# Then fix ReceiveModal same way

content = ''.join(lines)

# Fix 1: CreateOrderModal - add 2 missing closing divs
# Currently: "        </div>\n    </div>\n  )\n}\n\nfunction ReceiveModal"
# Need:      "      </div>\n    </div>\n  )\n}\n\nfunction ReceiveModal"
# Actually the issue is we need:
# Before: 
#   </div>
#   )
#   }
#   
#   function ReceiveModal({ order, onClose, onReceive }) { ... 
# After CreateOrderModal's return, we need:
#       </div>   <- closes <div style={{ ...modalStyle... }}>
#     </div>     <- closes <div style={overlayStyle}>
#   )
# }
# Currently it's:
#         </div>
#     </div>
#   )
# }

# The key insight: "        </div>" has 8 spaces, but "      </div>" has 6 (to close the inner modal div)
# and "    </div>" has 4 (to close the overlay div)

# First replace the CreateOrderModal's closing
import re

# Pattern for CreateOrderModal closing:
old1 = '''        </div>
  )
}

function ReceiveModal'''
new1 = '''      </div>
  )
}

function ReceiveModal'''
count1 = content.count(old1)
print(f"Fix1 occurrences: {count1}")
content = content.replace(old1, new1, 1)

# Fix 2: ReceiveModal closing
old2 = '''        </div>
  )
}

export default function'''
new2 = '''      </div>
  )
}

export default function'''
count2 = content.count(old2)
print(f"Fix2 occurrences: {count2}")
content = content.replace(old2, new2, 1)

# Fix 3: Stat cards - need </div> after each of the 3 middle stat cards
# Each stat card div is: <div style={{ background: COLORS.panel, ... }}>
#   <div>...</div>
#   <div>...</div>
#   (missing </div> for 2nd, 3rd, 4th)
# The last one "      </div>" closes only the outer wrapper

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

count3 = content.count(old3)
print(f"Fix3 occurrences: {count3}")
content = content.replace(old3, new3, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
