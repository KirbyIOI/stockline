with open('client/src/components/Sales.jsx', 'r') as f:
    lines = f.readlines()

# Print last 25 lines to see what's at the end
print("=== Last 25 lines ===")
for i, line in enumerate(lines[-25:], len(lines)-25):
    print(f"{i+1}: {repr(line)}")

print(f"\nTotal lines: {len(lines)}")
