import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# Fix 1: Close the flex-1 wrapper div in cart item (adds </div> before quantity controls)
old1 = '''                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)} each</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>'''

new1 = '''                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)} each</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>'''
c = c.replace(old1, new1)

# Fix 2: Close the saleResult return block properly
# The receipt box (receipt div) needs a </div>, the outer card div needs a </div>
old2 = '''            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#FAFBFD", borderTop: "1px solid " + COLORS.line, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span style={{ color: COLORS.primary }}>{money(saleResult.total)}</span>
            </div>
          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    );'''

new2 = '''            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#FAFBFD", borderTop: "1px solid " + COLORS.line, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span style={{ color: COLORS.primary }}>{money(saleResult.total)}</span>
            </div>
          <button onClick={resetSale} style={primaryBtnStyle}>New sale</button>
        </div>
    );'''
c = c.replace(old2, new2)

# Fix 3: Add missing </div> for the flex container (opened at "display: flex, gap: 20, flexWrap: wrap")
# and the outer wrapper div (opened at "<div>" for the return)
# Currently ends with:
#           </div>
#       </div>
#   );
# }
# Needs to be:
#           </div>
#         </div>
#       </div>
#     </div>
#   );
# }

# Find the end pattern and replace
old3 = '''          </div>
  );
}'''

new3 = '''          </div>
      </div>
  );
}'''
c = c.replace(old3, new3)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Opens: {opens}, Closes: {closes}, Balanced: {opens == closes}')
print('Done')
