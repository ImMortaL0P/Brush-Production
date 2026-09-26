// ========================================
// BRUSH — Shared navbar (<global-navbar>)
//
// The announcement bar is homepage-only: add the
// `announcement` attribute on the page that should show it
// (<global-navbar announcement></global-navbar> in index.html).
//
// "Categories" is a dropdown: product types on the left, poster genres on
// the right, each deep-linking into all_products.html's filters. On
// mobile (sheet menu) it becomes a tap-to-expand accordion.
//
// The navbar also owns the behavior every page needs from it — mobile
// menu, current-page highlight, cart badge — and gives the search / cart /
// account buttons a sensible fallback on pages that don't ship the full
// overlay markup (search overlay, cart drawer, auth modal), so no icon in
// the bar is ever a dead click.
// ========================================
(function () {
  const PRODUCT_TYPES = [
    { label: 'Posters', type: 'Posters', icon: 'fa-image' },
    { label: 'T-Shirts', type: 'Apparel', icon: 'fa-shirt' },
    { label: 'Stickers', type: 'Stickers', icon: 'fa-note-sticky' },
    { label: 'Wallpapers', type: 'Wallpapers', icon: 'fa-panorama' },
    { label: 'Collectibles', type: 'Collectibles', icon: 'fa-gem' },
  ];
  const GENRES = ['Anime', 'Movies', 'Minimalist', 'Space', 'Floral', 'Travel', 'Mythological', 'Pop Culture', 'Gaming', 'Board Finish'];

  const typeLinks = PRODUCT_TYPES.map(t =>
    `<a href="all_products.html?type=${encodeURIComponent(t.type)}" class="nav-dd-item"><i class="fa-solid ${t.icon}"></i><span>${t.label}</span></a>`
  ).join('');
  const genreLinks = GENRES.map(g =>
    `<a href="all_products.html?type=Posters&amp;category=${encodeURIComponent(g)}" class="nav-dd-genre">${g}</a>`
  ).join('');

  class GlobalNavbar extends HTMLElement {
    connectedCallback() {
      const showBar = this.hasAttribute('announcement');
      this.innerHTML = `
        <a href="#main-content" class="skip-link">Skip to content</a>
        ${showBar ? `<div class="announcement-bar" id="announcement-bar">
          🎨 Flat ₹54 shipping on every order &nbsp;|&nbsp; <a href="index.html#bestsellers">Shop Bestsellers →</a>
        </div>` : ''}
        <nav class="navbar" id="navbar">
          <a href="index.html" class="nav-brand" aria-label="Brush home">
            <img src="img/site/brush-logo-360.webp" alt="Brush" width="124" height="32">
          </a>

          <div class="nav-links" id="nav-links">
            <a href="index.html">Home</a>
            <div class="nav-dropdown" id="nav-categories">
              <button type="button" class="nav-dd-toggle" aria-expanded="false" aria-haspopup="true" aria-controls="nav-dd-panel">
                Categories <i class="fa-solid fa-chevron-down nav-dd-caret" aria-hidden="true"></i>
              </button>
              <div class="nav-dd-panel" id="nav-dd-panel" role="menu">
                <div class="nav-dd-col">
                  <p class="nav-dd-heading">Shop by product</p>
                  ${typeLinks}
                </div>
                <div class="nav-dd-col nav-dd-col-genres">
                  <p class="nav-dd-heading">Poster genres</p>
                  <div class="nav-dd-genres">${genreLinks}</div>
                  <a href="all_products.html" class="nav-dd-all">Browse everything →</a>
                </div>
              </div>
            </div>
            <a href="index.html#newarrival">New Arrivals</a>
            <a href="all_products.html">Shop All</a>
            <a href="institutional.html">B2B / Corporate</a>
            <a href="about_us.html">About</a>
          </div>

          <div class="nav-actions">
            <button class="nav-action-btn" id="search-btn" aria-label="Search">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <a href="index.html?open=orders" class="nav-action-btn" aria-label="Orders">
              <i class="fa-solid fa-box-open"></i>
            </a>
            <button class="nav-action-btn" data-theme-toggle aria-label="Toggle light / dark mode">
              <i class="fa-solid fa-moon theme-toggle-icon-dark"></i>
              <i class="fa-solid fa-sun theme-toggle-icon-light"></i>
            </button>
            <a href="index.html?open=account" class="nav-action-btn" aria-label="Account">
              <i class="fa-regular fa-user"></i>
            </a>
            <a href="checkout.html" class="nav-action-btn" id="cart-nav-btn" aria-label="Cart">
              <i class="fa-solid fa-bag-shopping"></i>
              <span class="cart-count" id="nav-cart-count" style="display: none;">0</span>
            </a>
            <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
      `;
      this.initDropdown();
      this.initSkipLink();
      this.markCurrentPage();
      this.initMobileMenu();
      this.initCartBadge();
      // Fallbacks need to know which overlays the page actually has, so they
      // wait for the rest of the document (and its deferred scripts).
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initFallbacks());
      } else {
        this.initFallbacks();
      }
    }

    // Keyboard users land on the page's <main> instead of tabbing through
    // the whole bar on every page load.
    initSkipLink() {
      this.querySelector('.skip-link').addEventListener('click', (e) => {
        const main = document.getElementById('main-content') || document.querySelector('main');
        if (!main) return;
        e.preventDefault();
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        main.scrollIntoView();
      });
    }

    markCurrentPage() {
      const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      this.querySelectorAll('.nav-links > a').forEach((a) => {
        const url = new URL(a.getAttribute('href'), window.location.href);
        const target = (url.pathname.split('/').pop() || 'index.html').toLowerCase();
        // "Shop All" only counts as current when no category filter narrows it.
        const current = target === page && !url.hash &&
          !(target === 'all_products.html' && (params.get('type') || params.get('category')));
        if (current) a.setAttribute('aria-current', 'page');
      });
      if (page === 'all_products.html' && (params.get('type') || params.get('category'))) {
        this.querySelector('.nav-dd-toggle').classList.add('is-current');
      }
    }

    // Scroll lock is shared with script.js's modals/drawer when present
    // (its lock is ref-counted), otherwise handled here directly.
    lockScroll(lock) {
      if (window.BrushScrollLock) {
        lock ? window.BrushScrollLock.lock() : window.BrushScrollLock.unlock();
        return;
      }
      document.body.style.overflow = lock ? 'hidden' : '';
      if (window.lenis) lock ? window.lenis.stop() : window.lenis.start();
    }

    initMobileMenu() {
      const toggle = this.querySelector('#menu-toggle');
      const links = this.querySelector('#nav-links');
      const setOpen = (open) => {
        if (links.classList.contains('open') === open) return;
        links.classList.toggle('open', open);
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        this.lockScroll(open);
      };
      toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
      links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('open')) {
          setOpen(false);
          toggle.focus();
        }
      });
      // Rotating to / resizing into the desktop layout must not leave the
      // page scroll-locked behind a sheet that is no longer shown.
      window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => {
        if (e.matches) setOpen(false);
      });
    }

    // Reads the cart straight from storage so the badge is right on every
    // page, including ones that don't load cart.js; stays live via cart.js's
    // change events when present and the storage event across tabs.
    initCartBadge() {
      const badge = this.querySelector('#nav-cart-count');
      const render = () => {
        let count = 0;
        try {
          const cart = JSON.parse(localStorage.getItem('brush_cart')) || [];
          count = cart.reduce((n, item) => n + (Number(item.quantity) || 0), 0);
        } catch (e) {}
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      };
      render();
      window.addEventListener('storage', (e) => { if (e.key === 'brush_cart') render(); });
      document.addEventListener('DOMContentLoaded', () => {
        if (typeof Cart !== 'undefined' && Cart.onChange) Cart.onChange(render);
      });
    }

    initFallbacks() {
      // Search: pages without the overlay get a lightweight one injected,
      // using the same markup/classes so it looks identical.
      if (!document.getElementById('search-overlay')) this.injectSearch();

      // Cart / account / orders: the hrefs above already point somewhere
      // useful (checkout, or the homepage which opens the right modal). On
      // pages that DO have the drawer/modals, script.js intercepts the click.
      const cartBtn = this.querySelector('#cart-nav-btn');
      if (!document.getElementById('cart-drawer') && /checkout\.html$/.test(window.location.pathname)) {
        cartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const summary = document.querySelector('.order-summary, .checkout-summary');
          if (summary) summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      if (!document.getElementById('auth-modal')) {
        const loggedIn = (() => { try { return !!localStorage.getItem('brushUser'); } catch (e) { return false; } })();
        const account = this.querySelector('a[aria-label="Account"]');
        const orders = this.querySelector('a[aria-label="Orders"]');
        account.href = loggedIn ? 'index.html?open=account' : 'index.html?login=1';
        orders.href = loggedIn ? 'index.html?open=orders' : 'index.html?login=1';
      }
    }

    injectSearch() {
      const overlay = document.createElement('div');
      overlay.className = 'search-overlay';
      overlay.id = 'search-overlay';
      overlay.innerHTML = `
        <div class="search-container" role="dialog" aria-modal="true" aria-label="Search">
          <button type="button" class="search-close-btn" aria-label="Close search"><i class="fa-solid fa-xmark"></i></button>
          <form class="global-search-form" role="search">
            <input type="search" name="search" placeholder="Search posters, categories, themes..." autocomplete="off" aria-label="Search products">
            <button type="submit" aria-label="Submit search"><i class="fa-solid fa-magnifying-glass"></i></button>
          </form>
        </div>`;
      document.body.appendChild(overlay);

      const input = overlay.querySelector('input');
      const searchBtn = this.querySelector('#search-btn');
      const close = () => {
        overlay.classList.remove('open');
        searchBtn.focus();
      };
      searchBtn.addEventListener('click', () => {
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 100);
      });
      overlay.querySelector('.search-close-btn').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) close();
      });
      overlay.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) window.location.href = 'all_products.html?search=' + encodeURIComponent(q);
      });
    }

    initDropdown() {
      const dd = this.querySelector('#nav-categories');
      const toggle = dd.querySelector('.nav-dd-toggle');
      const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
      const isSheet = () => window.matchMedia('(max-width: 1024px)').matches;
      let closeTimer = null;

      const setOpen = (open) => {
        dd.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!dd.classList.contains('open'));
      });

      dd.addEventListener('mouseenter', () => {
        if (!hoverCapable.matches || isSheet()) return;
        clearTimeout(closeTimer);
        setOpen(true);
      });
      dd.addEventListener('mouseleave', () => {
        if (!hoverCapable.matches || isSheet()) return;
        closeTimer = setTimeout(() => setOpen(false), 180);
      });

      document.addEventListener('click', (e) => {
        if (!dd.contains(e.target)) setOpen(false);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dd.classList.contains('open')) {
          setOpen(false);
          toggle.focus();
        }
      });
      dd.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    }
  }

  customElements.define('global-navbar', GlobalNavbar);
})();
