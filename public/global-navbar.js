class GlobalNavbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="announcement-bar" id="announcement-bar">
        🎨 Free Shipping on Orders Above ₹500 &nbsp;|&nbsp; <a href="index.html#bestsellers">Shop Bestsellers →</a>
      </div>
      <nav class="navbar" id="navbar">
        <a href="index.html" class="nav-brand" aria-label="Brush home" style="display: flex; align-items: center; gap: 8px;">
          <img src="img/site/brush-logo.png" alt="Brush" width="124" height="32" style="height: 32px; width: auto;">
        </a>

        <div class="nav-links" id="nav-links">
          <a href="index.html">Home</a>
          <a href="index.html#categories">Categories</a>
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
  }
}
customElements.define('global-navbar', GlobalNavbar);
