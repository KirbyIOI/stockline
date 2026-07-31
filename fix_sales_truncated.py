import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# The truncated line at line 182: "color: COL" followed by newline then "<button onClick"
old = "color: COL\n                    <button onClick"
new = "color: COLORS.sub }}>{money(item.product.price)}/unit</div>\n                    <button onClick"
c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
