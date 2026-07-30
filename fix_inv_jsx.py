with open('client/src/components/Inventory.jsx', 'r') as f:
    content = f.read()

# Fix 1: Close the <div> wrapping product name/sku before </td>
old = '''                    <div onClick={() => onSelectProduct(p.id)} style={{ cursor: "pointer" }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{p.sku}</div>
                  </td>'''

new = '''                    <div onClick={() => onSelectProduct(p.id)} style={{ cursor: "pointer" }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: COLORS.sub }}>{p.sku}</div>
                  </td>'''

content = content.replace(old, new)

# Fix 2: Close the outermost <div> at the end
old_end = '''          </table>
        </div>
  );
}'''

new_end = '''          </table>
        </div>
  );
}'''

content = content.replace(old_end, new_end)

with open('client/src/components/Inventory.jsx', 'w') as f:
    f.write(content)
print('Fixed Inventory.jsx')
