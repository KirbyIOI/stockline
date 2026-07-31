import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# In saleResult block: need to add 1 more </div> to close the outer wrapper (line 90)
# Current: </div>\n    </div>\n    );
# Need:    </div>\n  </div>\n    </div>\n    );
# 
# But looking at the file, the block is:
# ```
# 
# </div>
#     </div>
#     );
# ```
# The first </div> closes receipt container, second </div> closes card.
# Need to add a 3rd </div> to close the outer wrapper.

old = '\n</div>\n    </div>\n    );'
new = '\n</div>\n  </div>\n    </div>\n    );'
c = c.replace(old, new)

with open('client/src/components/Sales.jsx', 'w') as f:
    f.write(c)

opens = len(re.findall(r'<div(\s|>)', c))
closes = len(re.findall(r'</div>', c))
print(f'Divs: {opens} opens, {closes} closes, Balanced: {opens == closes}')
