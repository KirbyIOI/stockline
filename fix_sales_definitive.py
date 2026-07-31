import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# Step 1: Fix the truncated line (add back the full line with </div>)
old_trunc = '<div style={{ fontFamily: "\'IBM Plex Mono\', monospace", fontSize: 11.5, color: COL\n'
new_full = '                    <div style={{ fontFamily: "\'IBM Plex Mono\', monospace", fontSize: 11.5, color: COLORS.sub }}>{money(item.product.price)}/unit</div>\n'
c = c.replace(old_trunc, new_full)

# Step 2: Remove the extra </div> that was balancing the truncated div.
# The end of the file has 4 closing divs for 3 opens. Remove the extra one.
# Current end:
#           </div>
#       </div>
#         </div>
#     </div>
#   </div>
#   );
# }
#
# Should be:
#           </div>
#       </div>
#     </div>
#   );
# }
old_end = """          </div>
        </div>
  </div>
  );
}"""
new_end = """          </div>
    </div>
  );
}"""
c = c.replace(old_end, new_end)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
