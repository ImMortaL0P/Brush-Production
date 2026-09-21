const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

let announcementBarPattern = /<!--\s*Announcement Bar\s*-->\s*<div class="announcement-bar"[^>]*>[\s\S]*?<\/div>/i;
let navPattern = /<!--\s*Navbar\s*-->\s*<nav class="navbar"[^>]*>[\s\S]*?<\/nav>/i;
let brokenStart = /<!--\s*Announcement Bar\s*-->\s*<a href="index.html" class="nav-brand" aria-label="Brush home"([\s\S]*?)<\/nav>/; 
// in index.html, it's missing <div class="announcement-bar" and <nav>...

const navbarScript = `<script src="global-navbar.js"></script>`;
const globalNavTag = `\n  <global-navbar></global-navbar>\n`;

for (const file of files) {
  const filepath = path.join(publicDir, file);
  let content = fs.readFileSync(filepath, 'utf-8');

  // Ensure script is included in head
  if (!content.includes('global-navbar.js')) {
    content = content.replace(/(<\/head>)/i, `  ${navbarScript}\n$1`);
  }

  // Fixing index.html if it was mangled
  if (file === 'index.html' && content.includes('<!-- Announcement Bar -->\n    <a href="index.html"')) {
    content = content.replace(/<!-- Announcement Bar -->[\s\S]*?<\/nav>/i, globalNavTag);
  } else {
    // Normal replacement
    let hasReplaced = false;
    content = content.replace(/<!--\s*Announcement Bar\s*-->\s*<div class="announcement-bar"[\s\S]*?<\/div>/i, '');
    content = content.replace(/<!--\s*Navbar\s*-->\s*<nav class="navbar"[\s\S]*?<\/nav>/i, globalNavTag);
    
    // Some files might have different structures or ids
    if (!content.includes('<global-navbar>')) {
      content = content.replace(/<div class="announcement-bar"[\s\S]*?<\/div>/i, '');
      content = content.replace(/<nav class="navbar"[\s\S]*?<\/nav>/i, globalNavTag);
    }
  }

  fs.writeFileSync(filepath, content);
}
console.log('Fixed navbars');
