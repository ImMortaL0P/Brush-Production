const fs = require('fs');
let html = fs.readFileSync('public/institutional.html', 'utf8');

// The problematic nested group looks like this:
// <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
//   <a href="style_options.html?product=custom" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
//   <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
// </div>

const badRegex = /<div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">\s*<a href="style_options.html\?product=custom"[^>]*>View Style Options<\/a>\s*<a href="#quote-form" class="b2b-showcase-cta">Request Quote<\/a>\s*<\/div>/g;

html = html.replace(badRegex, '<a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>');

fs.writeFileSync('public/institutional.html', html);
console.log('Fixed nested buttons');
