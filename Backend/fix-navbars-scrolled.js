const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const files = ['checkout.html', 'order-confirmation.html'];

for (const file of files) {
  const filepath = path.join(publicDir, file);
  if (!fs.existsSync(filepath)) continue;
  let content = fs.readFileSync(filepath, 'utf-8');

  // Replace global navbar
  content = content.replace(/<!--\s*Navbar\s*-->\s*<nav class="navbar[^>]*>[\s\S]*?<\/nav>/i, `\n  <global-navbar></global-navbar>\n`);
  if (!content.includes('<global-navbar>')) {
     content = content.replace(/<nav class="navbar[^>]*>[\s\S]*?<\/nav>/i, `\n  <global-navbar></global-navbar>\n`);
  }

  fs.writeFileSync(filepath, content);
}
console.log('Fixed scrolled navbars');
