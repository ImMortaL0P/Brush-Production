const fs = require('fs');
let html = fs.readFileSync('public/institutional.html', 'utf8');

// 1. Add new items
const newItems = `
      <!-- Item 6: Books -->
      <div class="b2b-showcase-card">
        <div class="b2b-showcase-image-wrapper">
          <img src="https://placehold.co/1200x400/18181b/ffffff?font=outfit&text=Books" class="b2b-showcase-image" alt="Books" loading="lazy" decoding="async">
          <span class="b2b-showcase-badge">Custom</span>
        </div>
        <div class="b2b-showcase-content">
          <div class="b2b-showcase-header">
            <h3>Premium Books</h3>
          </div>
          <p class="b2b-showcase-desc">Hardcover and paperback books tailored to your story, featuring premium binding and high-grade printing.</p>
          <div class="b2b-showcase-footer">
            <div class="b2b-showcase-specs">
              <span><i class="fa-solid fa-book"></i> Hardcover / PB</span>
              <span><i class="fa-solid fa-layer-group"></i> Perfect Binding</span>
            </div>
            <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=books" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Item 7: Magazine -->
      <div class="b2b-showcase-card">
        <div class="b2b-showcase-image-wrapper">
          <img src="https://placehold.co/1200x400/18181b/ffffff?font=outfit&text=Magazine" class="b2b-showcase-image" alt="Magazine" loading="lazy" decoding="async">
          <span class="b2b-showcase-badge">Custom</span>
        </div>
        <div class="b2b-showcase-content">
          <div class="b2b-showcase-header">
            <h3>Magazines & Catalogs</h3>
          </div>
          <p class="b2b-showcase-desc">Vibrant gloss or matte finish pages for premium reading experiences and brand catalogs.</p>
          <div class="b2b-showcase-footer">
            <div class="b2b-showcase-specs">
              <span><i class="fa-solid fa-book-open"></i> Gloss/Matte</span>
              <span><i class="fa-solid fa-images"></i> Full Color</span>
            </div>
            <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=magazine" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Item 8: Label Tags -->
      <div class="b2b-showcase-card">
        <div class="b2b-showcase-image-wrapper">
          <img src="https://placehold.co/1200x400/18181b/ffffff?font=outfit&text=Label+Tags" class="b2b-showcase-image" alt="Label Tags" loading="lazy" decoding="async">
          <span class="b2b-showcase-badge">Custom</span>
        </div>
        <div class="b2b-showcase-content">
          <div class="b2b-showcase-header">
            <h3>Label Tags</h3>
          </div>
          <p class="b2b-showcase-desc">Distinctive tags and product labels precision-cut for an impeccable final touch to your products.</p>
          <div class="b2b-showcase-footer">
            <div class="b2b-showcase-specs">
              <span><i class="fa-solid fa-tag"></i> Die-Cut</span>
              <span><i class="fa-solid fa-barcode"></i> Scratch Resistant</span>
            </div>
            <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=label_tags" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Item 9: Note Pads -->
      <div class="b2b-showcase-card">
        <div class="b2b-showcase-image-wrapper">
          <img src="https://placehold.co/1200x400/18181b/ffffff?font=outfit&text=Note+Pads" class="b2b-showcase-image" alt="Note Pads" loading="lazy" decoding="async">
          <span class="b2b-showcase-badge">Custom</span>
        </div>
        <div class="b2b-showcase-content">
          <div class="b2b-showcase-header">
            <h3>Note Pads</h3>
          </div>
          <p class="b2b-showcase-desc">High-utility branded note pads ideal for seminars, corporate gifting, or internal office use.</p>
          <div class="b2b-showcase-footer">
            <div class="b2b-showcase-specs">
              <span><i class="fa-solid fa-pen-nib"></i> 80-100 GSM</span>
              <span><i class="fa-solid fa-marker"></i> Wire-O / Glued</span>
            </div>
            <div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=note_pads" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>
          </div>
        </div>
      </div>
    </div>`;

html = html.replace('    </div>\n\n    <div class="b2b-form-section" id="quote-form">', newItems + '\n\n    <div class="b2b-form-section" id="quote-form">');

// 2. Add checkboxes
const newCheckboxes = `
            <label class="checkbox-label"><input type="checkbox" name="services" value="certificates"> Certificates</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="letterheads"> Letterheads</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="visiting_cards"> Visiting Cards</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="envelopes"> Envelopes</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="flyers"> Flyers & Brochures</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="books"> Books</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="magazine"> Magazine</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="label_tags"> Label Tags</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="note_pads"> Note Pads</label>
            <label class="checkbox-label"><input type="checkbox" name="services" value="other"> Other Custom Prints</label>
`;
html = html.replace(/<label class="checkbox-label"><input type="checkbox" name="services" value="certificates"> Certificates<\/label>[\s\S]*?<label class="checkbox-label"><input type="checkbox" name="services" value="other"> Other Custom Prints<\/label>/m, newCheckboxes.trim());

// 3. For existing items, replace standalone Request Quote button
html = html.replace(/<a href="#quote-form" class="b2b-showcase-cta">Request Quote<\/a>/g, (match, offset, str) => {
  // Try to find the product name to put in the URL
  const chunk = str.substring(offset - 600, offset);
  let product = 'custom';
  if (chunk.includes('Certificates')) product = 'certificates';
  else if (chunk.includes('Envelopes')) product = 'envelopes';
  else if (chunk.includes('Letterheads')) product = 'letterheads';
  else if (chunk.includes('Visiting Cards')) product = 'visiting_cards';
  else if (chunk.includes('Flyers')) product = 'flyers';
  
  // The newly added items already have the group, so they won't match just this exact single string.
  return `<div class="b2b-cta-group" style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <a href="style_options.html?product=${product}" class="b2b-showcase-cta" style="background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);">View Style Options</a>
              <a href="#quote-form" class="b2b-showcase-cta">Request Quote</a>
            </div>`;
});

fs.writeFileSync('public/institutional.html', html);
console.log('Modified institutional.html');
