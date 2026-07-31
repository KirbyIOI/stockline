import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# Fix the truncated line: "color: COL" should be "color: COLORS.sub }}">{money(item.product.price)}/unit</div>"
old = 'color: COL\n                    <button onClick={() => updateQty'
new = "color: COLORS.sub }}>{money(item.product.price)}/unit</div>\n                    <button onClick={() => updateQty"
c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

# Verify
opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')

# Check if the line is now valid
lines = c.split('\n')
for i in range(178, 188):
    if i < len(lines):
        print(f'{i+1}: {lines[i][:100]}...' if len(lines[i]) > 100 else f'{i+1}: {lines[i]}')
