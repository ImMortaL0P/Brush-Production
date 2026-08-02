const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const files = {
  'Privacy': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/29/content.md',
  'Terms': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/30/content.md',
  'Refund': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/31/content.md',
  'Shipping': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/32/content.md'
};

let output = '';

for (const [name, file] of Object.entries(files)) {
  let content = fs.readFileSync(file, 'utf8');
  // strip out the markdown metadata at the top so JSDOM gets just HTML
  content = content.replace(/^[\s\S]*?---\s*/, '');
  
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  
  // Remove useless elements
  doc.querySelectorAll('script, style, nav, footer, header, svg, noscript, .announcement-bar, .header').forEach(el => el.remove());
  
  // Try to find the actual policy content. Usually inside .shopify-policy__body
  let body = doc.querySelector('.shopify-policy__body') || doc.querySelector('.rte') || doc.querySelector('main');
  
  if (body) {
    let text = body.textContent
      .replace(/\s+/g, ' ')
      .trim();
      
    output += `\n\n=== ${name} ===\n${text}\n`;
  } else {
    output += `\n\n=== ${name} ===\nCould not find main text.\n`;
  }
}

fs.writeFileSync('extracted_policies.txt', output);
console.log("Done extracting to extracted_policies.txt");
