# Fix malformed JSX in OrderHistory.jsx - missing closing </div> for overlay and stat card divs
content = open('client/src/components/OrderHistory.jsx', 'r', encoding='utf-8').read()

# Fix 1: CreateOrderModal missing overlay closing div
old1 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
  )
}'''

new1 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onCreate(productId, qty, supplierName)} style={primaryBtnStyle} disabled={!productId}>
            Place order
          </button>
        </div>
    </div>
  )
}'''

content = content.replace(old1, new1)

# Fix 2: ReceiveModal missing overlay closing div
old2 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
  )
}'''

new2 = '''        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={() => onReceive(order.id, units)} style={primaryBtnStyle}>Add to stock</button>
        </div>
    </div>
  )
}'''

content = content.replace(old2, new2)

open('client/src/components/OrderHistory.jsx', 'w', encoding='utf-8').write(content)
print('Fixed successfully')
