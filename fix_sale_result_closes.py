import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# The saleResult return block is missing closing </div> tags.
# Find the pattern: button + </div> + ); at the end of saleResult block
# Need to add 2 more </div> tags before the );

old = """          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    );"""

new = """          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    </div>
    );"""

c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
