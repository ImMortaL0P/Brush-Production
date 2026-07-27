const fs = require('fs');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync('public/index.html', 'utf8');
let scriptJs = fs.readFileSync('public/script.js', 'utf8');

// Wrap DOMContentLoaded body in try catch
scriptJs = scriptJs.replace(
  "document.addEventListener('DOMContentLoaded', () => {",
  "document.addEventListener('DOMContentLoaded', () => { try {"
);
scriptJs = scriptJs.replace(
  "\n});",
  "\n} catch(err) { console.error('CAUGHT:', err); }\n});"
);

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously"
});

const window = dom.window;
const document = window.document;

window.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
window.IntersectionObserver = class { observe() {} unobserve() {} };
window.fetch = async () => ({ ok: true, json: async () => ([]) });

try {
  window.eval(fs.readFileSync('public/cart.js', 'utf8'));
  window.eval(scriptJs);
  
  const event = document.createEvent('Event');
  event.initEvent('DOMContentLoaded', true, true);
  document.dispatchEvent(event);
} catch (err) {
  console.error(err);
}
