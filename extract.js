const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const files = [
  '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/29/content.md',
  '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/30/content.md',
  '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/31/content.md',
  '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/32/content.md'
];

for (let file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(content);
  const doc = dom.window.document;
  
  // Remove script and style tags
  doc.querySelectorAll('script, style').forEach(el => el.remove());
  
  const text = doc.body.textContent.replace(/\s+/g, ' ').trim();
  console.log("=== " + file.split('/').slice(-2,-1)[0] + " ===");
  
  // Try to find the policy section specifically if it exists, else print 2000 chars
  const policy = doc.querySelector('.shopify-policy__body') || doc.querySelector('.rte') || doc.querySelector('main');
  if (policy) {
     console.log(policy.textContent.replace(/\s+/g, ' ').trim().substring(0, 500) + "...\n");
  } else {
     console.log(text.substring(0, 500) + '...\n');
  }
}
