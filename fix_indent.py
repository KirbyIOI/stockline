import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# The line 182 <div> is at column 0 but should be indented to match the div above it (line 181)
# Line 181: "                    <div style={{ flex: 1, minWidth: 0 }}>"
# So line 182 should be: "                    <div style=..."
# Currently it's: "<div style=..."
# Fix: indent it to match

# Find the pattern: "ellipsis" }}>{item.product.name}</div>\n<div style={{ fontFamily:"
old = "ellipsis\" }}>{item.product.name}</div>\n<div style={{ fontFamily:"
new = "ellipsis\" }}>{item.product.name}</div>\n                    <div style={{ fontFamily:"
c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
