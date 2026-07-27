const fs = require('fs');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync('public/index.html', 'utf8');
let scriptJs = fs.readFileSync('public/script.js', 'utf8');

// Inject console logs
scriptJs = scriptJs.replace(
  "accountBtn.addEventListener('click', (e) => {",
  "accountBtn.addEventListener('click', (e) => { console.log('CLICKED ACCOUNT BTN');"
);
scriptJs = scriptJs.replace(
  "function openAuthModal() {",
  "function openAuthModal() { console.log('OPENING AUTH MODAL');"
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

  const btn = document.querySelector('a[aria-label="Account"]');
  if (btn) {
    btn.click();
    console.log("Auth modal classes: " + document.getElementById('auth-modal').className);
  }
} catch (err) {
  console.error(err);
}
