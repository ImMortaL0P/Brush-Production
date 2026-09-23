const fs = require('fs');
let html = fs.readFileSync('public/institutional.html', 'utf8');

// 1. Add ID Cards card after Note Pads
const idCardItem = `
      <!-- Item 10: ID Cards -->
      <div class="b2b-showcase-card">
        <div class="b2b-showcase-image-wrapper">
          <img src="https://placehold.co/1200x400/18181b/ffffff?font=outfit&text=ID+Cards" class="b2b-showcase-image" alt="ID Cards" loading="lazy" decoding="async">
          <span class="b2b-showcase-badge">Custom</span>
        </div>
        <div class="b2b-showcase-content">
          <div class="b2b-showcase-header">
            <h3>ID Cards & Lanyards</h3>
          </div>
          <p class="b2b-showcase-desc">Durable, high-quality corporate ID cards with crisp printing and integrated security features.</p>
          <div class="b2b-showcase-footer">
            <div class="b2b-showcase-specs">
              <span><i class="fa-solid fa-id-badge"></i> PVC / PET</span>
              <span><i class="fa-solid fa-print"></i> High-definition</span>
            </div>
            <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=id_cards" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>
          </div>
        </div>
      </div>
    </div>`;

html = html.replace('      <!-- Item 9: Note Pads -->', idCardItem.substring(0, idCardItem.length - 10) + '\n      <!-- Item 9: Note Pads -->');

// Re-do the replacement above to ensure it's placed at the end precisely without messing up divs.
// Wait, actually let's just replace `    </div>\n\n    <div class="b2b-form-section" id="quote-form">`
let newHtml = fs.readFileSync('public/institutional.html', 'utf8');
const idCardsFinal = `
      <!-- Item 10: ID Cards -->
      <div class="b2b-showcase-card">
        <div class="b2b-showcase-image-wrapper">
          <img src="https://placehold.co/1200x400/18181b/ffffff?font=outfit&text=ID+Cards" class="b2b-showcase-image" alt="ID Cards" loading="lazy" decoding="async">
          <span class="b2b-showcase-badge">Custom</span>
        </div>
        <div class="b2b-showcase-content">
          <div class="b2b-showcase-header">
            <h3>ID Cards & Lanyards</h3>
          </div>
          <p class="b2b-showcase-desc">Durable, high-quality corporate ID cards with crisp printing and integrated security features.</p>
          <div class="b2b-showcase-footer">
            <div class="b2b-showcase-specs">
              <span><i class="fa-solid fa-id-badge"></i> PVC / PET</span>
              <span><i class="fa-solid fa-print"></i> High-definition</span>
            </div>
            <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=id_cards" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>
          </div>
        </div>
      </div>
`;
newHtml = newHtml.replace('    </div>\n\n    <div class="b2b-form-section" id="quote-form">', idCardsFinal + '    </div>\n\n    <div class="b2b-form-section" id="quote-form">');

// 2. Add checkbox
const idCheckbox = `<label class="checkbox-label"><input type="checkbox" name="services" value="id_cards"> ID Cards</label>\n            <label class="checkbox-label"><input type="checkbox" name="services" value="other"> Other Custom Prints`;
newHtml = newHtml.replace('<label class="checkbox-label"><input type="checkbox" name="services" value="other"> Other Custom Prints', idCheckbox);

fs.writeFileSync('public/institutional.html', newHtml);

// 3. Patch style_options.html for ID Cards capitalisation
let styleHtml = fs.readFileSync('public/style_options.html', 'utf8');
styleHtml = styleHtml.replace(
  "else if (productName === 'note pads') productName = 'Note Pads';", 
  "else if (productName === 'note pads') productName = 'Note Pads';\n    else if (productName.toLowerCase() === 'id cards') productName = 'ID Cards';"
);
fs.writeFileSync('public/style_options.html', styleHtml);
console.log('Modified both files successfully.');
