import re

path = r"C:\Users\krypt\Downloads\niz\stockline\client\src\components\OrderHistory.jsx"

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: CreateOrderModal - add missing </div> for modal container
old1 = '          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>\n            Place order\n          </button>\n        </div>\n    </div>\n  )\n}\n\nfunction ReceiveModal'
new1 = '          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>\n            Place order\n          </button>\n        </div>\n      </div>\n    </div>\n  )\n}\n\nfunction ReceiveModal'
assert old1 in c, 'Fix1 pattern not found'
c = c.replace(old1, new1, 1)
print('Fix1 OK')

# Fix 2: ReceiveModal - add missing </div> for modal container
old2 = '          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>\n        </div>\n    </div>\n  )\n}\n\nexport default function'
new2 = '          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>\n        </div>\n      </div>\n    </div>\n  )\n}\n\nexport default function'
assert old2 in c, 'Fix2 pattern not found'
c = c.replace(old2, new2, 1)
print('Fix2 OK')

# Fix 3: Stat cards - add 3 missing </div> tags
old3a = "\"" + "'Space Grotesk',sans-serif" + "\"" + ", fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{orders.filter((o) => o.status === " + "\"" + "open" + "\"" + ").length}</div>\n        <div style={{ background: COLORS.panel, border: " + "\"" + "1px solid " + "\"" + " + COLORS.line, borderRadius: 12, padding: " + "\"" + "14px 18px" + "\"" + ", flex: 1, minWidth: 120 }}>\n          <div style={{ fontFamily: " + "\"" + "Inter" + "\"" + ", fontSize: 12, color: COLORS.sub, marginBottom: 4 }}>Received</div>"

# Simpler approach - use raw strings for stat cards
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find stat cards section
for i, ln in enumerate(lines):
    if 'fontFamily: ' + "'Space Grotesk'" in ln and 'COLORS.amber' in ln:
        # This is the Open stat card value line
        # Next line should be </div> but currently starts the next card
        if not lines[i+1].strip().startswith('</div>'):
            # Insert </div> after this line
            lines.insert(i+1, '        </div>\n')
            print(f'Fix3a OK at line {i+1}')
        break

# Re-scan for the Received value line
c2 = ''.join(lines)
for i, ln in enumerate(lines):
    if 'fontFamily: ' + "'Space Grotesk'" in ln and 'COLORS.teal' in ln:
        if not lines[i+1].strip().startswith('</div>'):
            lines.insert(i+1, '        </div>\n')
            print(f'Fix3b OK at line {i+1}')
        break

c2 = ''.join(lines)
for i, ln in enumerate(lines):
    if 'fontFamily: ' + "'Space Grotesk'" in ln and 'COLORS.rose' in ln:
        # line has Cancelled value - next is the outer </div>
        # Replace the line to keep both closing tags
        old_line = lines[i]
        # The next line is '      </div>' - that closes the outer cards wrapper
        # We need to close the individual card div first
        lines[i] = old_line.rstrip('\n') + '\n        </div>\n'
        print(f'Fix3c OK at line {i+1}')
        break

result = ''.join(lines)
with open(path, 'w', encoding='utf-8') as f:
    f.write(result)
print('All fixes applied')
