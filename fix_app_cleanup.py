import re

with open('client/src/App.jsx', 'r') as f:
    c = f.read()

# Remove the recordSale function (dead code)
old = """  const recordSale = withErrorHandling(async (product, units) => {
    await api.recordSale(product.id, units);
    setSaleFor(null);
    await Promise.all([refreshProducts(), refreshSummary()]);
    if (selectedId === product.id) api.getProduct(product.id).then(setSelectedDetail);
  });

"""
c = c.replace(old, '')

# Remove the SaleModal JSX block
old = """      {saleFor && (
        <SaleModal product={saleFor} onClose={() => setSaleFor(null)} onRecord={(units) => recordSale(saleFor, units)} />
      )}
"""
c = c.replace(old, '')

# Fix the blank line issue from edit tool
c = c.replace(
    '  const [search, setSearch] = useState("");\n\n  const [receiveFor',
    '  const [search, setSearch] = useState("");\n  const [receiveFor'
)

with open('client/src/App.jsx', 'w') as f:
    f.write(c)

print('Dead code removed successfully')
if 'saleFor' not in c and 'saleFor' not in c.split('ReceiveModal')[-1] and 'recordSale' not in c and 'SaleModal' not in c:
    print('OK: all dead code removed')
else:
    print('WARNING: still has references')
