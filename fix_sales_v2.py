import re

with open('client/src/components/Sales.jsx', 'r') as f:
    lines = f.readlines()

# Print lines around key areas
print("=== Lines 108-114 (saleResult section end) ===")
for i in range(107, min(114, len(lines))):
    print(f"{i+1}: {repr(lines[i])}")

print("\n=== Lines 179-195 (cart item) ===")
for i in range(178, min(195, len(lines))):
    print(f"{i+1}: {repr(lines[i])}")

print(f"\n=== Lines 205-210 (end of file) ===")
for i in range(max(0, len(lines)-8), len(lines)):
    print(f"{i+1}: {repr(lines[i])}")
