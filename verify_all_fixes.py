import re

with open('client/src/components/Sales.jsx', 'r') as f:
    c = f.read()
opens = len(re.findall(r'<div\s', c))
closes = len(re.findall(r'</div>', c))
print(f'Sales.jsx: {opens} opens, {closes} closes, Balanced: {opens == closes}')

with open('server/src/index.js', 'r') as f:
    c = f.read()
has_route = '/api/sales' in c
print(f'index.js: /api/sales route present: {has_route}')

with open('client/src/App.jsx', 'r') as f:
    c = f.read()
clean = 'saleFor' not in c and 'recordSale' not in c and 'SaleModal' not in c
print(f'App.jsx dead code removed: {clean}')

# Check git
import subprocess
result = subprocess.run(['git', 'diff', '--stat'], capture_output=True, text=True)
print(f'\nUncommitted changes:\n{result.stdout if result.stdout else "(none)"}')
