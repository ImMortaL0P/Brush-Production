const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

let content = fs.readFileSync('/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/29/content.md', 'utf8');
content = content.replace(/^[\s\S]*?---\s*/, '');
const dom = new JSDOM(content);
const doc = dom.window.document;
doc.querySelectorAll('script, style, noscript, svg, nav, footer, header').forEach(el => el.remove());
console.log(doc.body ? doc.body.textContent.replace(/\s+/g, ' ').substring(0, 1000) : "No body");
