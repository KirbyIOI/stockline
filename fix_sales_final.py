with open('client/src/components/Sales.jsx', 'r') as f:
    lines = f.readlines()

# 1. Insert a left column "</div>" close after the table wrapper div (before the cart sidebar div)
for i in range(len(lines)-1):
    stripped = lines[i].strip()
    if stripped == '</div>' and 'width: 380' in lines[i+1] and 'flex' in lines[i+1]:
        lines.insert(i+1, '        </div>\n')
        break

# 2. At the end, insert 2 missing div closes before "  );"
for i in range(len(lines)-1, -1, -1):
    if '  );' in lines[i]:
        lines.insert(i, '        </div>\n')  # close flex wrapper
        lines.insert(i, '      </div>\n')    # close outer wrapper
        break

with open('client/src/components/Sales.jsx', 'w') as f:
    f.writelines(lines)
print('Done fixing divs.')
print(f'File now has {len(lines)} lines')
