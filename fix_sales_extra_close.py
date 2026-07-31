import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# End of file has 4 closing divs for the main return block but only 3 div opens.
# Structure: return (<div> <div> </div> <div> </div> </div>)
# Opens:  <div> (1) <div> (2) <div> (3) <div> (4) <div> (5) = 5
# Closes: </div> </div> </div> = 6
# Remove the extra last </div> before the );
# Current ending pattern (4 closes):
#       </div>     (close for cart container div)
#     </div>       (close for flex-wrap div)
#   </div>         (close for outer div)
#   </div>         (EXTRA!)
#   );
# }
# 
# Should be (3 closes):
#       </div>     (close for cart container div)
#     </div>       (close for flex-wrap div)
#   </div>         (close for outer div)
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
