import re

with open('client/src/components/OrderHistory.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: CreateOrderModal - add missing closing </div> before the closing bracket
old1 = '''        </div>
  )
}

function ReceiveModal'''
new1 = '''        </div>
    </div>
  )
}

function ReceiveModal'''
text = text.replace(old1, new1)

# Fix 2: ReceiveModal - add missing closing </div>
old2 = '''        </div>
  )
}

export default function'''
new2 = '''        </div>
    </div>
  )
}

export default function'''
text = text.replace(old2, new2)

with open('client/src/components/OrderHistory.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed successfully')
