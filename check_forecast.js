const fs = require('fs');
const c = fs.readFileSync('server/src/forecast.js', 'utf8');
console.log('Length:', c.length);
// Check for stray HTML
const htmlIdx = c.indexOf('</create_file>');
if (htmlIdx !== -1) {
  console.log('FOUND </create_file> at index', htmlIdx);
  console.log('Context:', JSON.stringify(c.substring(Math.max(0, htmlIdx - 40), htmlIdx + 40)));
}
// Last 100 chars
console.log('Last 100 chars:', JSON.stringify(c.slice(-100)));
