const fs = require('fs');
const c = fs.readFileSync('server/src/forecast.js', 'utf8');
// Check for stray HTML
if (c.includes('</create_file>')) {
  console.log('ERROR: still has </create_file>');
  process.exit(1);
}
if (c.includes('</div>')) {
  console.log('ERROR: has stray </div>');
  process.exit(1);
}
console.log('forecast.js is clean, length:', c.length);
// Try to parse with node --check
const { execSync } = require('child_process');
try {
  execSync('node --check server/src/forecast.js', { cwd: 'C:/Users/krypt/Downloads/niz/stockline', stdio: 'pipe' });
  console.log('Syntax check: OK');
} catch (e) {
  console.log('Syntax error:', e.stderr?.toString() || e.message);
  process.exit(1);
}
