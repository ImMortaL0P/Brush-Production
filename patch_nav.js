const fs = require('fs');
let html = fs.readFileSync('public/style_options.html', 'utf8');

// Insert sub-nav below paragraph in header
const subNav = `
      <div style="margin-top: 2rem; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
        <a href="#section-style" class="b2b-showcase-cta" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.8rem 1.5rem; text-decoration: none;">Styles</a>
        <a href="#section-design" class="b2b-showcase-cta" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.8rem 1.5rem; text-decoration: none;">Designs</a>
        <a href="#section-showcase" class="b2b-showcase-cta" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.8rem 1.5rem; text-decoration: none;">Showcase</a>
      </div>`;

html = html.replace('offer for \' + productName.toLowerCase() + \'.\';', 'offer for \' + productName.toLowerCase() + \'.\';\n    \n    // In-page subnav styling logic could go here');
html = html.replace("</p>\n    </div>\n\n    <div class=\"style-container\">", "</p>" + subNav + "\n    </div>\n\n    <div class=\"style-container\">");

fs.writeFileSync('public/style_options.html', html);
console.log('Added subnav');
