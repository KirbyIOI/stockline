import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()

# Count all <div and </div> (including self-closing ones we don't count)
opens = [(i, m.start()) for i, m in enumerate(re.finditer(r'<div\s', c))]
closes = [(i, m.start()) for i, m in enumerate(re.finditer(r'</div>', c))]

print(f'Opens ({len(opens)}):')
for idx, pos in opens:
    line = c[:pos].count('\n') + 1
    print(f'  #{idx} at pos {pos} (line {line})')

print(f'\nCloses ({len(closes)}):')
for idx, pos in closes:
    line = c[:pos].count('\n') + 1
    print(f'  #{idx} at pos {pos} (line {line})')
