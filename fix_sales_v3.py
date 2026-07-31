import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# The saleResult return block is missing 2 closing </div> tags.
# After "New sale" button and its close </div>, we need two more </div> to close
# the card wrapper <div> and the outer <div>.
# Currently:
#           <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
#         </div>
#     );
# 
# Should be:
#           <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
#         </div>
#       </div>
#     </div>
#     );

old = """          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    );
  }"""

new = """          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    </div>
    );
  }"""

c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
