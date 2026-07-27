const fs = require('fs');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync('public/index.html', 'utf8');
let scriptJs = fs.readFileSync('public/script.js', 'utf8');

scriptJs = "console.log('START SCRIPT');\n" + scriptJs;
scriptJs = scriptJs.replace(
  "const accountBtn = document.querySelector('a[aria-label=\"Account\"]');",
  "console.log('REACHED LINE 646');\nconst accountBtn = document.querySelector('a[aria-label=\"Account\"]');"
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
