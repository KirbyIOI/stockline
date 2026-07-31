import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# The committed version had the line at line 182 truncated.
# Original should be (looking at the pattern):
# <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)}/unit</div>
# But it cut off at "color: COL" and the newline was followed by "<button onClick"

# The truncated content replaces what was originally a full line.
# Replace the broken line with the correct full line:
old = '<div style={{ fontFamily: "\'IBM Plex Mono\', monospace", fontSize: 11.5, color: COL\n'
new = '                    <div style={{ fontFamily: "\'IBM Plex Mono\', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)}/unit</div>\n'

c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
