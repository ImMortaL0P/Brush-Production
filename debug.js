const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('public/index.html', 'utf8');
const cartJs = fs.readFileSync('public/cart.js', 'utf8');
const scriptJs = fs.readFileSync('public/script.js', 'utf8');

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously"
});

const window = dom.window;
const document = window.document;

// Add mock local storage
window.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Add mock IntersectionObserver
window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
};
window.fetch = async () => ({ ok: true, json: async () => ([]) });

try {
  window.eval(cartJs);
  window.eval(scriptJs);
  
  // Simulate DOMContentLoaded
  const event = document.createEvent('Event');
  event.initEvent('DOMContentLoaded', true, true);
  window.document.dispatchEvent(event);

  // Click the account button
  const btn = document.querySelector('a[aria-label="Account"]');
  if (btn) {
    console.log("Account button found!");
    btn.click();
    console.log("Auth modal classes: " + document.getElementById('auth-modal').className);
  } else {
    console.log("Account button NOT found!");
  }
} catch (err) {
  console.error(err);
}
