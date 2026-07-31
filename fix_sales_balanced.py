import re

with open('client/src/components/Sales.jsx', 'r') as f:
    lines = f.readlines()

c = ''.join(lines)

# Fix 1: In saleResult return block, add missing </div> for SectionHeader wrapper
old1 = '          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>\n        </div>\n    </div>\n    );'
new1 = '          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>\n        </div>\n      </div>\n    </div>\n    );'
c = c.replace(old1, new1)

# Fix 2: In main return block, add missing </div> for the outer SectionHeader wrapper
old2 = '      </div>\n        </div>\n    </div>\n  );'
new2 = '      </div>\n        </div>\n    </div>\n  </div>\n  );'
c = c.replace(old2, new2)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div(\s|>)', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')

# Show the last 20 lines for verification
last_lines = c.split('\n')[-20:]
for i, line in enumerate(last_lines, len(c.split('\n'))-19):
    print(f'{i}: {repr(line)}')
