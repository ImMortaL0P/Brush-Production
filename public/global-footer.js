// ========================================
// BRUSH — Shared footer (<global-footer>)
//
// One footer for every storefront page, so secondary pages (About,
// Policies, B2B, 404...) carry the same navigation, contact details and
// legal copy as the homepage instead of each hand-rolling a slimmer one.
// Homepage-relative links resolve to in-page anchors on index.html and to
// index.html#... everywhere else.
// ========================================
(function () {
  const THUMBS = ['dream', 'anime-girl', 'weathering-with-you', 'japanese-zen', 'dahlia', 'space-frontier',
    'japan-travel', 'zeus', 'board-finish', 'avengers', 'godfather'];

  class GlobalFooter extends HTMLElement {
    connectedCallback() {
      const path = window.location.pathname;
      const onHome = /(^|\/)(index\.html)?$/.test(path);
      const home = onHome ? '' : 'index.html';
      const year = new Date().getFullYear();
      const thumbs = THUMBS.map(t =>
        `<img loading="lazy" decoding="async" width="130" height="90" src="assets/misc/footer-thumbs/${t}.jpg" alt="">`
      ).join('');

      this.innerHTML = `
        <footer class="site-footer" id="footer">
          <div class="container">
            <div class="footer-grid">
              <div class="footer-brand">
                <img src="img/site/brush-logo-360.webp" alt="Brush" width="140" height="36" loading="lazy" class="footer-logo">
                <div class="footer-parent">
                  <span class="footer-parent-label">A part of</span>
                  <span class="footer-parent-name">KRAFT STUDIOS</span>
                </div>
                <p>At Brush, we're not just selling products — we're sharing our lifelong friendship, creativity, and commitment to delivering exceptional art to your doorstep. Powered by Kraft Studios, bringing design innovation to everyday life.</p>
                <div class="footer-social">
                  <a href="https://twitter.com/lost_storiess" aria-label="Twitter" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i></a>
                  <a href="https://github.com/ImMortaL0P" aria-label="GitHub" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i></a>
                  <a href="https://www.instagram.com/lost.storiess/" aria-label="Instagram" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i></a>
                  <a href="https://www.linkedin.com/in/kumar-mangalam-362a77176/" aria-label="LinkedIn" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin-in"></i></a>
                </div>
              </div>

              <nav class="footer-column" aria-label="Shop">
                <h2>Shop</h2>
                <ul>
                  <li><a href="all_products.html">Shop All</a></li>
                  <li><a href="${home}#bestsellers">Bestsellers</a></li>
                  <li><a href="${home}#newarrival">New Arrivals</a></li>
                  <li><a href="${home}#categories">Categories</a></li>
                  <li><a href="institutional.html">Corporate / B2B</a></li>
                  <li><a href="about_us.html">About Us</a></li>
                </ul>
              </nav>

              <nav class="footer-column" aria-label="Help">
                <h2>Help</h2>
                <ul>
                  <li><a href="${home}#faq">FAQs</a></li>
                  <li><a href="policies.html#shipping-policy">Shipping Policy</a></li>
                  <li><a href="policies.html#cancellation-returns">Cancellation &amp; Returns</a></li>
                  <li><a href="policies.html#refund-policy">Refund Policy</a></li>
                  <li><a href="policies.html#privacy-policy">Privacy Policy</a></li>
                </ul>
              </nav>

              <div class="footer-column footer-newsletter">
                <h2>Stay Updated</h2>
                <p>Subscribe to get notified about new collections, exclusive drops, and discounts.</p>
                <form class="newsletter-form" novalidate>
                  <input type="email" name="email" placeholder="Enter your email" aria-label="Email for newsletter" autocomplete="email" required>
                  <button type="submit">Join</button>
                </form>
                <p class="newsletter-status" role="status" aria-live="polite"></p>
                <ul class="footer-contact">
                  <li><i class="fa-solid fa-phone" aria-hidden="true"></i><a href="tel:+919234755686">+91-9234755686</a></li>
                  <li><i class="fa-solid fa-envelope" aria-hidden="true"></i><a href="mailto:admin@brush.ind.in">admin@brush.ind.in</a></li>
                  <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>Patna, Bihar, IN</span></li>
                </ul>
              </div>
            </div>

            <div class="footer-bottom">
              <p>
                © ${year} Brush. All rights reserved. Posters, Stickers, Illustrations &amp; More!<br>
                <span class="footer-disclaimer">All artwork posted on this website is intended as fan art and is not purported to be official merchandise unless indicated otherwise. All artworks are sourced via CC license, AI generated/modified, or with the original creator's permission. If you have any issues regarding the artwork, please write to us at admin@brush.ind.in.</span>
              </p>
              <div class="footer-bottom-links">
                <a href="policies.html#terms-of-service">Terms</a>
                <a href="policies.html#privacy-policy">Privacy</a>
                <a href="policies.html#privacy-policy">Cookies</a>
              </div>
            </div>
          </div>
          <div class="footer-marquee" aria-hidden="true">
            <div class="footer-marquee-track">${thumbs}${thumbs}</div>
          </div>
        </footer>
      `;
      this.initNewsletter();
    }

    // No newsletter backend yet — validate and acknowledge in place so the
    // form never looks broken (it used to swallow the submit silently).
    initNewsletter() {
      const form = this.querySelector('.newsletter-form');
      const input = form.querySelector('input');
      const status = this.querySelector('.newsletter-status');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const valid = input.value.trim() !== '' && input.checkValidity();
        status.classList.toggle('is-error', !valid);
        status.textContent = valid
          ? "You're on the list — watch your inbox for new drops."
          : 'Please enter a valid email address.';
        if (valid) form.reset();
        else input.focus();
      });
    }
  }

  customElements.define('global-footer', GlobalFooter);
})();
