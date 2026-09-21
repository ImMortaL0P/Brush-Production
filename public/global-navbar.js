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
        ${showBar ? `<div class="announcement-bar" id="announcement-bar">
          🎨 Flat ₹54 shipping on every order &nbsp;|&nbsp; <a href="index.html#bestsellers">Shop Bestsellers →</a>
        </div>` : ''}
        <nav class="navbar" id="navbar">
          <a href="index.html" class="nav-brand" aria-label="Brush home" style="display: flex; align-items: center; gap: 8px;">
            <img src="img/site/brush-logo.png" alt="Brush" width="124" height="32" style="height: 32px; width: auto;">
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
            <a href="about_us.html">About</a>
          </div>

          <div class="nav-actions">
            <button class="nav-action-btn" id="search-btn" aria-label="Search">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <a href="javascript:void(0)" class="nav-action-btn" aria-label="Orders">
              <i class="fa-solid fa-box-open"></i>
            </a>
            <button class="nav-action-btn" data-theme-toggle aria-label="Toggle light / dark mode">
              <i class="fa-solid fa-moon theme-toggle-icon-dark"></i>
              <i class="fa-solid fa-sun theme-toggle-icon-light"></i>
            </button>
            <a href="javascript:void(0)" class="nav-action-btn" aria-label="Account">
              <i class="fa-regular fa-user"></i>
            </a>
            <a href="javascript:void(0)" class="nav-action-btn" id="cart-nav-btn" aria-label="Cart">
              <i class="fa-solid fa-bag-shopping"></i>
              <span class="cart-count" id="nav-cart-count" style="display: none;">0</span>
            </a>
            <button class="menu-toggle" id="menu-toggle" aria-label="Toggle menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
      `;
      this.initDropdown();
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
