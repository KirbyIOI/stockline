import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# Fix the indentation of the line that was truncated - it's at column 0 but should be indented
# Current: "<div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)}/unit</div>"
# Should be: "                    <div ..."
old = '<div style={{ fontFamily: \"\'IBM Plex Mono\', monospace\", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)}/unit</div>\n                    <button'
new = '                    <div style={{ fontFamily: "\'IBM Plex Mono\', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)}/unit</div>\n                    <button'
c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
