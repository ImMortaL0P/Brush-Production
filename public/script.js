// ========================================
// BRUSH — Main Script
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5500/api' : 'https://brush-production.onrender.com/api';

  // Anything rendered via innerHTML that ultimately came from another
  // shopper (review author/comment, most notably) must go through this
  // first — reviews are the one piece of user-generated content every
  // visitor to a product renders unauthenticated.
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Shared across every decorative-motion feature below (hero parallax already
  // gates itself via window.lenis; category tilt and the carousel's internal
  // parallax gate directly on this).
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scroll lock (mobile menu, cart drawer, product modal) ----
  // document.body.style.overflow = 'hidden' alone doesn't stop Lenis — it
  // intercepts wheel/touch input directly and drives scroll independently
  // of the underlying CSS overflow, so the page kept scrolling behind any
  // open overlay even with overflow locked. Needs both. Reference-counted
  // so if two overlays ever end up open at once, the first one closing
  // doesn't prematurely unlock scroll out from under the other.
  let scrollLockCount = 0;

  function lockPageScroll() {
    scrollLockCount++;
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
  }

  function unlockPageScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = '';
      if (window.lenis) window.lenis.start();
    }
  }

  // ---- Preloader ----
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const percentEl = document.getElementById('preloader-percent');
    const fillEl = document.getElementById('preloader-fill');
    // Critical, above-the-fold assets — the "first half" of the site the preloader waits on.
    const criticalImages = Array.from(document.querySelectorAll('.hero-slide img, .nav-brand img, .preloader-logo'));
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

    const total = criticalImages.length + 1; // +1 for web fonts
    let loaded = 0;
    let finished = false;

    function updateProgress() {
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      if (percentEl) percentEl.textContent = pct + '%';
      if (fillEl) fillEl.style.width = pct + '%';
      if (pct >= 100) hidePreloader();
    }

    function markLoaded() {
      loaded++;
      updateProgress();
    }

    function hidePreloader() {
      if (finished) return;
      finished = true;
      setTimeout(() => {
        preloader.classList.add('preloader-hidden');
        document.body.classList.remove('preloader-active');
        setTimeout(() => preloader.remove(), 500);
      }, 200);
    }

    criticalImages.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        markLoaded();
      } else {
        img.addEventListener('load', markLoaded, { once: true });
        img.addEventListener('error', markLoaded, { once: true });
      }
    });

    fontsReady.then(markLoaded).catch(markLoaded);

    // Safety net so a stalled resource never traps the user on the preloader.
    setTimeout(() => {
      if (!finished) {
        loaded = total;
        updateProgress();
      }
    }, 5000);

    updateProgress();
  }

  // Navbar scroll behavior (scrolled-state, hide-on-scroll-down, scroll
  // progress) now lives in navbar-scroll.js, shared across every page with
  // a navbar — this reference is kept only because the anchor-scroll
  // handler further down still needs navbar.offsetHeight.
  const navbar = document.getElementById('navbar');


  // ---- Mobile menu toggle ----
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      if (navLinks.classList.contains('open')) {
        lockPageScroll();
      } else {
        unlockPageScroll();
      }
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        // Only unlock if this link click is what's actually closing an open
        // menu (on desktop these links are always visible/clickable with
        // the menu never "open" in the mobile sense — mustn't decrement a
        // lock that was never acquired).
        if (navLinks.classList.contains('open')) {
          unlockPageScroll();
        }
        navLinks.classList.remove('open');
      });
    });
  }


  // ---- Global Search ----
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchCloseBtn = document.getElementById('search-close-btn');
  const globalSearchForm = document.getElementById('global-search-form');
  const globalSearchInput = document.getElementById('global-search-input');

  if (searchBtn && searchOverlay) {
    searchBtn.addEventListener('click', () => {
      searchOverlay.classList.add('open');
      if (globalSearchInput) {
        setTimeout(() => globalSearchInput.focus(), 100);
      }
    });
  }

  if (searchCloseBtn && searchOverlay) {
    searchCloseBtn.addEventListener('click', () => {
      searchOverlay.classList.remove('open');
    });
  }

  // Close on Escape - same convention as the cart drawer's own Escape
  // handler below; this one and the product modal's were missing it.
  if (searchOverlay) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchOverlay.classList.contains('open')) {
        searchOverlay.classList.remove('open');
      }
    });
  }

  if (globalSearchForm) {
    globalSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = globalSearchInput.value.trim();
      if (query) {
        window.location.href = 'all_products.html?search=' + encodeURIComponent(query);
      }
    });
  }
  
  const suggestionsBox = document.getElementById('search-suggestions');
  if (globalSearchInput && suggestionsBox) {
    globalSearchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length < 2) {
        suggestionsBox.classList.remove('active');
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/products`);
        const products = await res.json();
        
        const matched = products.filter(p => {
          const name = (p.name || '').toLowerCase();
          const cat = (p.category || '').toLowerCase();
          const keys = (p.keywords || '').toLowerCase();
          return name.includes(query) || cat.includes(query) || keys.includes(query);
        }).slice(0, 5);
        
        if (matched.length > 0) {
          suggestionsBox.innerHTML = matched.map(p => `
            <a href="all_products.html?search=${encodeURIComponent(p.name)}" class="suggestion-item">
              <div class="mockup-wrapper" style="flex-shrink: 0;">
                <img src="assets/mockup_2.jpg" class="mockup-frame" alt="Frame">
                <img src="${p.image}" class="mockup-poster" alt="${p.name}">
                <img src="${p.image}" class="mockup-hover" alt="${p.name}">
              </div>
              <div class="suggestion-item-details">
                <span class="suggestion-title">${p.name}</span>
                <span class="suggestion-cat">${p.category}</span>
              </div>
            </a>
          `).join('');
          suggestionsBox.classList.add('active');
        } else {
          suggestionsBox.innerHTML = '<div style="padding:10px 15px; color:var(--text-secondary);">No matches found</div>';
          suggestionsBox.classList.add('active');
        }
      } catch (err) {
        console.error('Search error', err);
      }
    });

    document.addEventListener('click', (e) => {
      // Close suggestions
      if (!suggestionsBox.contains(e.target) && e.target !== globalSearchInput) {
        suggestionsBox.classList.remove('active');
      }
      
      // Close search overlay entirely (either click on the overlay backdrop, or outside completely)
      if (searchOverlay.classList.contains('open')) {
        const clickedInsideContainer = searchOverlay.querySelector('.search-container').contains(e.target);
        const clickedSearchBtn = searchBtn && searchBtn.contains(e.target);
        
        if (!clickedInsideContainer && !clickedSearchBtn) {
          searchOverlay.classList.remove('open');
        }
      }
    });
  }


  // ---- Hero Slider ----
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let currentSlide = 0;
  let slideInterval;

  function goToSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % slides.length);
  }

  function startSlider() {
    slideInterval = setInterval(nextSlide, 5000);
  }

  function resetSlider() {
    clearInterval(slideInterval);
    startSlider();
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goToSlide(parseInt(dot.dataset.index));
      resetSlider();
    });
  });

  if (slides.length > 0) {
    startSlider();
  }


  // ---- Hero Parallax + Scroll Cue ----
  // Gated entirely on window.lenis existing, which is itself already the
  // single source of truth for "decorative scroll motion is appropriate
  // right now" — scroll.js refuses to create it under prefers-reduced-motion
  // or if the Lenis CDN script failed to load, so this block simply never
  // runs in either case rather than needing its own reduced-motion check.
  const heroEl = document.getElementById('hero');
  const heroSliderEl = document.getElementById('hero-slider');
  const heroContentEl = heroEl ? heroEl.querySelector('.hero-content') : null;
  const scrollCueEl = document.getElementById('scroll-cue');

  if (heroEl && window.lenis) {
    const updateHeroParallax = (scrollY) => {
      const heroHeight = heroEl.offsetHeight;
      if (scrollY > heroHeight) return; // nothing left to update once the hero is fully scrolled past

      const progress = Math.min(1, scrollY / heroHeight);

      if (heroSliderEl) {
        // Background lags behind the page scroll (classic parallax depth cue).
        // Safe from gaps: overflow:hidden on .hero clips both the shifted-away
        // top edge (always in the already-scrolled-past region, since this
        // multiplier keeps the shift smaller than scrollY itself) and the
        // shifted-in excess at the bottom.
        heroSliderEl.style.transform = `translateY(${scrollY * 0.3}px)`;
      }

      if (heroContentEl) {
        // Foreground content rises and fades faster than the scroll itself,
        // separating it visually from the (slower) background layer.
        heroContentEl.style.transform = `translateX(-50%) translateY(${scrollY * -0.18}px)`;
        heroContentEl.style.opacity = String(Math.max(0, 1 - progress * 1.3));
      }

      if (scrollCueEl) {
        scrollCueEl.classList.toggle('is-hidden', scrollY > 40);
      }
    };

    updateHeroParallax(window.lenis.scroll || 0);
    window.lenis.on('scroll', (e) => updateHeroParallax(e.scroll));
  }


  // Category card hover depth used to be a JS-driven cursor-tracked 3D tilt
  // (perspective()/rotateX/rotateY). Removed: animating that transform via
  // CSS transition reliably broke overflow:hidden clipping on the card's
  // .mockup-wrapper descendant in Chromium — the poster rendered unclipped
  // and the frame graphic disappeared, on every normal hover, not as an
  // edge case. Neither swapping scale3d() for 2D scale() nor forcing a
  // permanent compositing layer via will-change fixed it once the
  // transform was animated rather than set statically. Replaced with a
  // plain CSS translateY+scale hover (see .category-card:hover in
  // styles.css) — no JS needed for it at all.


  // ---- Hero Poster Counter ----
  // Counts up to the live product total, but never sits frozen at 0 —
  // if the backend (Render free tier) is cold-starting or unreachable,
  // it settles on a realistic fallback instead of stalling indefinitely.
  const posterCountEl = document.getElementById('poster-count-number');
  let posterCountResolved = false;

  function animateCounterTo(el, target) {
    const duration = 1400;
    const startTime = performance.now();
    const startValue = parseInt(el.textContent, 10) || 0;
    if (startValue === target) return;

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const value = Math.round(startValue + (target - startValue) * eased);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function reportPosterCount(count) {
    if (posterCountResolved || !posterCountEl || !count) return;
    posterCountResolved = true;
    animateCounterTo(posterCountEl, count);
  }

  if (posterCountEl) {
    const FALLBACK_POSTER_COUNT = 150;
    const fallbackTimer = setTimeout(() => reportPosterCount(FALLBACK_POSTER_COUNT), 4000);

    fetch(API_BASE + '/products')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('bad status'))))
      .then(products => {
        clearTimeout(fallbackTimer);
        reportPosterCount(products.length);
      })
      .catch(() => {
        clearTimeout(fallbackTimer);
        reportPosterCount(FALLBACK_POSTER_COUNT);
      });
  }


  // ---- Product carousels (Bestsellers & New Arrivals) ----
  // Poster images drift a few px within their frame as the track scrolls —
  // cards near the track's center stay put, cards toward the edges shift
  // slightly, giving each card a small internal parallax as it slides past.
  // Skipped under reduced motion, same as every other scroll-tied effect.
  function updateCardParallax(track) {
    if (prefersReducedMotion) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenterX = trackRect.left + trackRect.width / 2;

    // Read every card's position first, then write transforms in a second
    // pass — interleaving getBoundingClientRect() with style writes forces
    // a layout recalculation on every iteration instead of once.
    // Two card types share this: product cards (.mockup-poster, safe to
    // drive via .style.transform directly — nothing else there sets its
    // transform) and Wall Setup Packs (.ws-img-container img, which has its
    // own :hover scale() rule, so it's driven via a CSS custom property
    // instead — see .ws-img-container img in styles.css — so this doesn't
    // clobber that with an inline style).
    const updates = [];
    track.querySelectorAll('.mockup-poster').forEach((poster) => {
      const card = poster.closest('.product-card');
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const offset = Math.max(-6, Math.min(6, (cardCenterX - trackCenterX) * 0.015));
      updates.push({ img: poster, offset, viaProperty: false });
    });
    track.querySelectorAll('.ws-img-container img').forEach((img) => {
      const card = img.closest('.wall-setup-card');
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const offset = Math.max(-6, Math.min(6, (cardCenterX - trackCenterX) * 0.015));
      updates.push({ img, offset, viaProperty: true });
    });
    updates.forEach(({ img, offset, viaProperty }) => {
      if (viaProperty) {
        img.style.setProperty('--ws-parallax-x', `${offset}px`);
      } else {
        img.style.transform = `translateX(${offset}px)`;
      }
    });
  }

  function setupCarousel(trackId, prevId, nextId, counterId) {
    const track = document.getElementById(trackId);
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const counterEl = counterId ? document.getElementById(counterId) : null;

    if (!track || !prevBtn || !nextBtn) return () => {};

    function update() {
      const pageWidth = track.clientWidth;
      const totalPages = Math.max(1, Math.ceil(track.scrollWidth / pageWidth));
      const maxScroll = track.scrollWidth - pageWidth;
      // Use progress toward the max scrollable distance rather than a flat division —
      // the last page is often narrower than a full page, which would otherwise under-count it.
      const progress = maxScroll > 0 ? track.scrollLeft / maxScroll : 0;
      const currentPage = Math.min(totalPages, Math.round(progress * (totalPages - 1)) + 1);

      if (counterEl) {
        counterEl.textContent = totalPages > 1 ? `${currentPage} / ${totalPages}` : '';
      }
      prevBtn.disabled = track.scrollLeft <= 4;
      nextBtn.disabled = track.scrollLeft >= maxScroll - 4;
      updateCardParallax(track);
    }

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
    });
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
    });
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);

    update();
    return update;
  }

  const updateBestsellersCarousel = setupCarousel('product-list', 'bestsellers-prev', 'bestsellers-next', 'bestsellers-counter');
  const updateNewArrivalsCarousel = setupCarousel('scroll-track', 'scroll-prev', 'scroll-next', 'newarrival-counter');
  const updateGrossingCarousel = setupCarousel('grossing-track', 'grossing-prev', 'grossing-next', 'grossing-counter');
  setupCarousel('ws-track', 'ws-prev', 'ws-next', 'ws-counter');


  // ---- Scroll to Top button ----
  const scrollTopBtn = document.getElementById('scroll-top');

  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 600) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  // ---- Intersection Observer for fade-in animations ----
  // Hoisted (not block-scoped to the `if` below) and wrapped in a helper so
  // content injected later — the product carousels below fetch from the API
  // asynchronously, well after this initial pass — can opt into the same
  // real scroll-reveal instead of the old workaround of shipping it
  // pre-marked .visible (which skipped the animation entirely, and for the
  // same reason a .fade-in element hidden at observe-time never fires: see
  // the near-identical bug fixed in the category "View More" toggle).
  let revealObserver = null;

  function observeRevealElements(root = document) {
    const elements = root.querySelectorAll('.fade-in, .scale-in, .clip-reveal');
    if (revealObserver) {
      elements.forEach(el => revealObserver.observe(el));
    } else {
      elements.forEach(el => el.classList.add('visible'));
    }
  }

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });
  }

  observeRevealElements();


  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = navbar ? navbar.offsetHeight : 0;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight - 10;
        // Route through Lenis when it's running — native scrollTo fights
        // Lenis's own rAF-driven position updates and produces a jitter.
        if (window.lenis) {
          window.lenis.scrollTo(targetPos);
        } else {
          window.scrollTo({ top: targetPos, behavior: 'smooth' });
        }
      }
    });
  });


  // ========================================
  // PRODUCT FETCHING & RENDERING
  // ========================================
  
  function toggleSection(sectionId, visible) {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = visible ? '' : 'none';
  }

  async function loadProducts() {
    const productList = document.getElementById('product-list');
    const scrollTrack = document.getElementById('scroll-track');
    const grossingTrack = document.getElementById('grossing-track');

    if (!productList && !scrollTrack && !grossingTrack) return;

    try {
      const res = await fetch(API_BASE + '/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const products = await res.json();

      reportPosterCount(products.length);

      // Homepage placement is admin-curated via checkboxes in the admin panel
      const bestSellers = products.filter(p => p.showInBestsellers);
      const newArrivals = products.filter(p => p.showInNewArrivals);
      const grossingPicks = products.filter(p => p.showInGrossing);

      const createProductCard = (p, delayIndex = 0, badge = 'Sale', badgeBg = '') => {
        const delayClass = delayIndex > 0 ? `fade-in-delay-${delayIndex}` : '';
        const badgeStyle = badgeBg ? `style="background: ${badgeBg}; color: var(--bg-primary);"` : '';
        const discountPercentage = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

        const stockQty = p.stockQuantity !== undefined ? p.stockQuantity : 50;
        const isOut = stockQty <= 0;
        // The picture-frame-on-wall mockup only makes sense for posters —
        // a plate or wallpaper roll photographed "framed on a wall" would
        // misrepresent the product, so those types just show the plain photo.
        const isPoster = (p.productType || 'poster') === 'poster';
        const specLine = isPoster
          ? `<span><i class="fa-solid fa-gem"></i> 300 GSM Matte</span><span><i class="fa-solid fa-truck-fast"></i> Fast Dispatch</span>`
          : `<span><i class="fa-solid fa-gem"></i> Premium Quality</span><span><i class="fa-solid fa-truck-fast"></i> Fast Dispatch</span>`;

        return `
          <div class="product-card scale-in ${delayClass}" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-original="${p.originalPrice || p.price}" data-image="${p.image}" data-stock="${stockQty}" data-product-type="${p.productType || 'poster'}">
            <div class="product-card-image">
              ${isPoster ? `
                <div class="mockup-wrapper">
                  <img src="assets/mockup_2.jpg" class="mockup-frame" alt="Frame" loading="lazy">
                  <img src="${p.image}" class="mockup-poster" alt="${p.name}" loading="lazy">
                  <img src="${p.image}" class="mockup-hover" alt="${p.name}" loading="lazy">
                </div>
              ` : `
                <img src="${p.image}" class="plain-product-image" alt="${p.name}" loading="lazy">
              `}
              <span class="product-badge" ${badgeStyle}>${p.badge || badge}</span>
              <div class="product-quick-actions">
                <div class="product-card-specs">
                  ${specLine}
                </div>
                <button class="quick-add-btn" ${isOut ? 'disabled style="background: rgba(0,0,0,0.8); color: var(--text-muted); cursor: not-allowed;"' : ''}>
                  ${isOut ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
            <div class="product-card-info">
              <h3>${p.name}</h3>
              <div class="product-pricing">
                <span class="price-current">₹${p.price}</span>
                ${p.originalPrice > p.price ? `<span class="price-original">₹${p.originalPrice}</span>` : ''}
                ${discountPercentage > 0 ? `<span class="price-discount">${discountPercentage}% OFF</span>` : ''}
              </div>
            </div>
          </div>
        `;
      };

      toggleSection('bestsellers', bestSellers.length > 0);
      if (productList) {
        productList.innerHTML = bestSellers.map((p, i) => createProductCard(p, i % 4, 'Trending')).join('');
        observeRevealElements(productList);
      }

      toggleSection('newarrival', newArrivals.length > 0);
      if (scrollTrack) {
        scrollTrack.innerHTML = newArrivals.map(p => createProductCard(p, 0, 'New', 'var(--accent)')).join('');
        observeRevealElements(scrollTrack);
      }

      toggleSection('grossing-picks', grossingPicks.length > 0);
      if (grossingTrack) {
        grossingTrack.innerHTML = grossingPicks.map((p, i) => createProductCard(p, i % 4, 'Trending')).join('');
        observeRevealElements(grossingTrack);
      }

      updateBestsellersCarousel();
      updateNewArrivalsCarousel();
      updateGrossingCarousel();

    } catch (err) {
      console.error('Error loading products:', err);
      if (productList) productList.innerHTML = '<p>Failed to load products. Please try again later.</p>';
    }
  }

  loadProducts();


  // ========================================
  // CART SYSTEM INTEGRATION
  // ========================================

  if (typeof Cart === 'undefined') return; // Cart module not loaded

  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartContinueBtn = document.getElementById('cart-continue-btn');
  const cartBody = document.getElementById('cart-drawer-body');
  const cartFooter = document.getElementById('cart-drawer-footer');
  const cartDrawerCount = document.getElementById('cart-drawer-count');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartShipping = document.getElementById('cart-shipping');
  const cartTotal = document.getElementById('cart-total');
  const navCartCount = document.querySelector('.cart-count');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');


  // ---- Open / Close cart drawer ----
  function openCart() {
    // openCart() is also called as a "flash the drawer" nudge after Add to
    // Cart even when it's already open — only acquire the lock on a genuine
    // closed->open transition, or a second nudge while already open would
    // double-lock and leave scroll stuck after a single close.
    const wasOpen = cartDrawer.classList.contains('open');
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
    if (!wasOpen) lockPageScroll();
  }

  function closeCart() {
    const wasOpen = cartDrawer.classList.contains('open');
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
    if (wasOpen) unlockPageScroll();
  }

  // Cart icon in navbar opens drawer
  const cartNavBtn = document.querySelector('.nav-action-btn[aria-label="Cart"]');
  if (cartNavBtn) {
    cartNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
  }

  // ---- Fly to cart ----
  // Clones the poster image being added, flies it from its current on-screen
  // position to the cart icon, then pops the icon on arrival. Purely
  // decorative feedback layered on top of the real add-to-cart logic below,
  // so it's gated behind prefers-reduced-motion like the rest of this site's
  // decorative motion (cursor, magnetic buttons, parallax).
  function flyToCart(sourceImgEl) {
    if (prefersReducedMotion || !cartNavBtn || !sourceImgEl) return;

    const startRect = sourceImgEl.getBoundingClientRect();
    const endRect = cartNavBtn.getBoundingClientRect();
    if (startRect.width === 0 || startRect.height === 0) return;

    const clone = document.createElement('img');
    clone.src = sourceImgEl.currentSrc || sourceImgEl.src;
    clone.className = 'fly-to-cart-clone';
    clone.style.top = `${startRect.top}px`;
    clone.style.left = `${startRect.left}px`;
    clone.style.width = `${startRect.width}px`;
    clone.style.height = `${startRect.height}px`;
    document.body.appendChild(clone);

    void clone.offsetWidth; // force layout so the transform below transitions instead of jumping straight there

    const dx = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
    const dy = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.12) rotate(8deg)`;
    clone.style.opacity = '0.25';

    clone.addEventListener('transitionend', () => {
      clone.remove();
      cartNavBtn.classList.add('cart-pop');
      setTimeout(() => cartNavBtn.classList.remove('cart-pop'), 400);
    }, { once: true });
  }

  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
  if (cartContinueBtn) cartContinueBtn.addEventListener('click', closeCart);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer.classList.contains('open')) {
      closeCart();
    }
  });


  // ---- Toast notification ----
  let toastTimer;
  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2500);
  }


  // One-line variant description for a cart line item, e.g. "A4 · 80 GSM"
  // or "10" Round" — reads Cart's shared PRODUCT_TYPES config so labels
  // stay in sync with whatever the modal actually offered.
  function formatCartVariantLine(item) {
    if (!item.variants) return '';
    const typeConfig = Cart.typeConfigFor(item.productType || 'poster');
    return typeConfig.variantGroups
      .filter(group => item.variants[group.key] !== undefined)
      .map(group => {
        const option = group.options.find(o => o.value === item.variants[group.key]);
        return option ? option.label : item.variants[group.key];
      })
      .join(' · ');
  }

  // ---- Render cart drawer ----
  function renderCartDrawer() {
    const items = Cart.getCart();
    const count = Cart.getItemCount();

    // Update nav badge
    if (navCartCount) {
      navCartCount.textContent = count;
      navCartCount.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update drawer count
    if (cartDrawerCount) {
      cartDrawerCount.textContent = `(${count})`;
    }

    // Render items
    if (!cartBody) return;

    if (items.length === 0) {
      cartBody.innerHTML = `
        <div class="cart-empty">
          <i class="fa-solid fa-bag-shopping"></i>
          <h4>Your cart is empty</h4>
          <p>Browse our collections and add some art!</p>
        </div>
      `;
      if (cartFooter) cartFooter.style.display = 'none';
      return;
    }

    if (cartFooter) cartFooter.style.display = 'block';

    cartBody.innerHTML = items.map(item => `
      <div class="cart-item" data-cart-id="${item.cartId || item.id}">
        <div class="cart-item-image">
          <div class="mockup-wrapper">
            <img src="assets/mockup_2.jpg" class="mockup-frame" alt="Frame">
            <img src="${item.image}" class="mockup-poster" alt="${item.name}">
            <img src="${item.image}" class="mockup-hover" alt="${item.name}">
          </div>
        </div>
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          ${formatCartVariantLine(item) ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">${formatCartVariantLine(item)}</div>` : ''}
          <div class="cart-item-price">
            <strong>₹${item.price}</strong> × ${item.quantity} = ₹${item.price * item.quantity}
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-minus" data-id="${item.cartId || item.id}" aria-label="Decrease quantity">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-plus" data-id="${item.cartId || item.id}" aria-label="Increase quantity" ${item.quantity >= (item.stockQuantity !== undefined ? item.stockQuantity : 50) ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>+</button>
            </div>
            <button class="cart-item-remove" data-id="${item.cartId || item.id}" aria-label="Remove item">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Update totals
    if (cartSubtotal) cartSubtotal.textContent = '₹' + Cart.getSubtotal();
    if (cartShipping) {
      const shipping = Cart.getShipping();
      cartShipping.textContent = shipping === 0 ? 'FREE' : '₹' + shipping;
      cartShipping.style.color = shipping === 0 ? 'var(--success)' : '';
    }
    if (cartTotal) cartTotal.textContent = '₹' + Cart.getTotal();

    // Bind quantity controls
    cartBody.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = Cart.getCart().find(i => i.cartId === id || i.id === parseInt(id) || i.id === id);
        if (item && item.quantity > 1) {
          Cart.updateQuantity(id, item.quantity - 1);
        } else {
          Cart.removeItem(id);
        }
      });
    });

    cartBody.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = Cart.getCart().find(i => i.cartId === id || i.id === parseInt(id) || i.id === id);
        if (item) {
          const maxStock = item.stockQuantity !== undefined ? item.stockQuantity : 50;
          if (item.quantity >= maxStock) {
            showToast(`Only ${maxStock} items available in stock.`);
          } else {
            Cart.updateQuantity(id, item.quantity + 1);
          }
        }
      });
    });

    cartBody.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.removeItem(btn.dataset.id);
        showToast('Item removed from cart');
      });
    });
  }

  // Listen for cart changes
  Cart.onChange(renderCartDrawer);

  // Initial render
  renderCartDrawer();


  // ---- "Add to Cart" buttons ----
  function handleAddToCart(btn) {
    const card = btn.closest('.product-card');
    if (!card) return;

    const product = {
      id: parseInt(card.dataset.id),
      name: card.dataset.name,
      price: parseInt(card.dataset.price),
      originalPrice: parseInt(card.dataset.original),
      image: card.dataset.image,
      stockQuantity: parseInt(card.dataset.stock) || 0,
      productType: card.dataset.productType || 'poster'
    };

    if (!product.id || !product.name) return;

    flyToCart(card.querySelector('.mockup-poster'));
    Cart.addItem(product, 1);

    // Button feedback
    const originalText = btn.textContent;
    btn.textContent = '✓ Added!';
    btn.classList.add('added');

    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('added');
    }, 1500);

    showToast(`${product.name} added to cart!`);

    // Open cart drawer briefly
    openCart();
  }

  // Attach to all "Add to Cart" / "Quick Add" buttons and Product Modals
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-add-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      handleAddToCart(btn);
      return;
    }
    
    const nextBtn = e.target.closest('.modal-next-btn');
    if (nextBtn) {
      e.preventDefault();
      openProductModal(nextBtn.dataset.nextId);
      return;
    }

    const card = e.target.closest('.product-card');
    if (card) {
      e.preventDefault();
      openProductModal(card.dataset.id);
    }
  });

  // Finds the product after `currentId` among whichever product cards are
  // actually on screen right now (a homepage carousel, or the current
  // filtered/paginated All Products page) — not the full catalog, so
  // "Next" always matches what the shopper was just browsing.
  function getNextProductId(currentId) {
    const ids = [...document.querySelectorAll('.product-card[data-id]')]
      .map(el => el.dataset.id)
      .filter((id, i, arr) => arr.indexOf(id) === i);
    if (ids.length < 2) return null;
    const idx = ids.indexOf(String(currentId));
    if (idx === -1) return null;
    return ids[(idx + 1) % ids.length];
  }


  // ========================================
  // PRODUCT MODAL SYSTEM
  // ========================================
  const productModal = document.getElementById('product-modal');
  const productModalOverlay = document.getElementById('product-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  let currentProduct = null;

  async function openProductModal(productId) {
    // Guarded the same way as openCart() — harmless in practice today (the
    // overlay blocks clicks reaching another product card while open) but
    // keeps the lock/unlock pairing correct even if that ever changes.
    const wasOpen = productModal.classList.contains('open');
    productModal.classList.add('open');
    productModalOverlay.classList.add('open');
    if (!wasOpen) lockPageScroll();

    try {
      const res = await fetch(`${API_BASE}/products/${productId}`);
      if (!res.ok) throw new Error('Product not found');
      currentProduct = await res.json();
      
      const modalImageCol = document.querySelector('.modal-image-col');
      const nextId = getNextProductId(productId);
      const modalProductType = currentProduct.productType || 'poster';
      const isPosterModal = modalProductType === 'poster';
      const nextBtnHtml = nextId ? `<button class="modal-next-btn" id="modal-next-btn" data-next-id="${nextId}">Next ${isPosterModal ? 'Poster' : Cart.typeConfigFor(modalProductType).label} <i class="fa-solid fa-arrow-right"></i></button>` : '';
      modalImageCol.innerHTML = isPosterModal ? `
        <div class="mockup-wrapper">
          <img src="assets/mockup_2.jpg" class="mockup-frame" alt="Frame">
          <img src="${currentProduct.image}" class="mockup-poster" alt="${currentProduct.name}">
          <img src="${currentProduct.image}" class="mockup-hover" alt="${currentProduct.name}">
          ${nextBtnHtml}
        </div>
      ` : `
        <div class="modal-plain-image-wrapper">
          <img src="${currentProduct.image}" class="modal-plain-image" alt="${currentProduct.name}">
          ${nextBtnHtml}
        </div>
      `;
      
      document.getElementById('modal-title').textContent = currentProduct.name;
      document.getElementById('modal-description').textContent = currentProduct.description || 'Premium high-quality poster for your space.';
      document.getElementById('modal-original-price').textContent = currentProduct.originalPrice ? `₹${currentProduct.originalPrice}` : '';
      
      const stockStatus = document.getElementById('modal-stock-status');
      const addBtn = document.getElementById('modal-add-to-cart');
      const stock = currentProduct.stockQuantity !== undefined ? currentProduct.stockQuantity : 50;
      
      if (stock <= 0) {
        stockStatus.textContent = "Out of Stock";
        stockStatus.style.color = "var(--sale-red)";
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
        addBtn.style.cursor = 'not-allowed';
      } else {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.cursor = 'pointer';
        
        if (stock < 10) {
          stockStatus.textContent = `Only ${stock} left!`;
          stockStatus.style.color = "var(--sale-red)";
        } else {
          stockStatus.textContent = "In Stock";
          stockStatus.style.color = "var(--text-secondary)";
        }
      }
      
      renderVariantSelectors(currentProduct.productType || 'poster');
      updateModalPrice();
      renderReviews();
    } catch (err) {
      console.error(err);
      showToast('Failed to load product details');
      closeProductModal();
    }
  }

  function closeProductModal() {
    const wasOpen = productModal.classList.contains('open');
    productModal.classList.remove('open');
    productModalOverlay.classList.remove('open');
    if (wasOpen) unlockPageScroll();
    currentProduct = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);
  if (productModalOverlay) productModalOverlay.addEventListener('click', closeProductModal);

  // Close on Escape - same convention as the cart drawer's own Escape handler.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && productModal.classList.contains('open')) {
      closeProductModal();
    }
  });

  function setActiveSwatch(group, value) {
    group.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  function getActiveSwatch(group) {
    return group.querySelector('.swatch-btn.active') || group.querySelector('.swatch-btn');
  }

  // Builds the modal's variant swatch groups from whatever this product's
  // type actually offers (poster: Size + Paper Quality, plate: Plate Size,
  // wallpaper: Roll Size) — reads Cart's shared PRODUCT_TYPES config so a
  // new type only has to be added in one place (cart.js) to show up here.
  const variantSelectorsEl = document.getElementById('variant-selectors');
  function renderVariantSelectors(productType) {
    if (!variantSelectorsEl) return;
    const typeConfig = Cart.typeConfigFor(productType);
    variantSelectorsEl.innerHTML = typeConfig.variantGroups.map(group => `
      <div class="selector-group">
        <label id="variant-label-${group.key}">${group.label}</label>
        <div class="swatch-group" data-group-key="${group.key}" role="group" aria-labelledby="variant-label-${group.key}">
          ${group.options.map((opt, i) => `
            <button type="button" class="swatch-btn ${i === 0 ? 'active' : ''}" data-value="${opt.value}" data-price="${opt.priceDelta}">
              ${opt.label}${opt.priceDelta ? ` <small>${opt.priceDelta > 0 ? `+₹${opt.priceDelta}` : `-₹${Math.abs(opt.priceDelta)}`}</small>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function updateModalPrice() {
    if (!currentProduct || !variantSelectorsEl) return;

    let finalPrice = currentProduct.price;
    variantSelectorsEl.querySelectorAll('.swatch-group').forEach(group => {
      finalPrice += parseInt(getActiveSwatch(group).dataset.price);
    });
    if (finalPrice < 10) finalPrice = 10;

    document.getElementById('modal-price').textContent = `₹${finalPrice}`;
    document.getElementById('modal-btn-price').textContent = `₹${finalPrice}`;
  }

  // One delegated listener handles every group regardless of how many the
  // current product type has — the swatch markup itself is rebuilt per
  // product by renderVariantSelectors(), so per-group listeners would need
  // re-attaching on every modal open.
  if (variantSelectorsEl) {
    variantSelectorsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.swatch-btn');
      if (!btn) return;
      setActiveSwatch(btn.closest('.swatch-group'), btn.dataset.value);
      updateModalPrice();
    });
  }

  function getSelectedVariants() {
    const variants = {};
    if (!variantSelectorsEl) return variants;
    variantSelectorsEl.querySelectorAll('.swatch-group').forEach(group => {
      variants[group.dataset.groupKey] = getActiveSwatch(group).dataset.value;
    });
    return variants;
  }

  const modalAddToCartBtn = document.getElementById('modal-add-to-cart');
  if (modalAddToCartBtn) {
    modalAddToCartBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      if (currentProduct.stockQuantity !== undefined && currentProduct.stockQuantity <= 0) {
        showToast('Sorry, this product is currently out of stock.');
        return;
      }

      const variants = getSelectedVariants();
      const finalPrice = parseInt(document.getElementById('modal-price').textContent.replace('₹', ''));

      // Capture the modal's poster position before closeProductModal() starts
      // its own close transition, which would otherwise move/fade it out from
      // under a getBoundingClientRect() read.
      flyToCart(document.querySelector('.modal-image-col .mockup-poster, .modal-image-col .modal-plain-image'));

      Cart.addItem(currentProduct, 1, variants, finalPrice);
      showToast(`${currentProduct.name} added to cart!`);
      closeProductModal();
      openCart();
    });
  }

  function renderReviews() {
    const list = document.getElementById('reviews-list');
    const count = document.getElementById('review-count');
    const reviews = currentProduct.reviews || [];

    count.textContent = reviews.length;

    if (reviews.length === 0) {
      list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No reviews yet. Be the first to review!</p>';
      return;
    }

    list.innerHTML = reviews.map(r => {
      // Reviews come from unauthenticated shoppers, so `user`/`comment` must
      // never reach innerHTML unescaped — an attacker submitting a review
      // is the site's single largest stored-XSS surface otherwise, hit by
      // every visitor who opens that product. Rating is also clamped:
      // 'x'.repeat() throws on a negative count, which would break the
      // whole reviews list for a malformed/malicious rating value.
      const stars = Math.max(0, Math.min(5, Math.round(Number(r.rating)) || 0));
      const safeUser = escapeHtml(r.user);
      return `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${safeUser}</span>
          <span class="review-date">${new Date(r.date).toLocaleDateString()}</span>
        </div>
        <div class="review-stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
        <p class="review-text">${escapeHtml(r.comment)}</p>
        ${r.photo ? `<img class="review-photo" src="${escapeHtml(r.photo)}" alt="Photo from ${safeUser}'s review" loading="lazy">` : ''}
      </div>
    `;
    }).join('');
  }

  const reviewForm = document.getElementById('review-form');
  const reviewPhotoInput = document.getElementById('review-photo');
  const reviewPhotoPreview = document.getElementById('review-photo-preview');
  const reviewPhotoLabelText = document.getElementById('review-photo-label-text');

  if (reviewPhotoInput) {
    reviewPhotoInput.addEventListener('change', () => {
      const file = reviewPhotoInput.files[0];
      if (!file) {
        reviewPhotoPreview.hidden = true;
        reviewPhotoLabelText.textContent = 'Add a photo (optional)';
        return;
      }
      reviewPhotoPreview.src = URL.createObjectURL(file);
      reviewPhotoPreview.hidden = false;
      reviewPhotoLabelText.textContent = file.name;
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentProduct) return;

      const btn = reviewForm.querySelector('button');
      btn.textContent = 'Submitting...';
      btn.disabled = true;

      const payload = new FormData();
      payload.append('user', document.getElementById('review-name').value);
      payload.append('rating', document.getElementById('review-rating').value);
      payload.append('comment', document.getElementById('review-comment').value);
      if (reviewPhotoInput && reviewPhotoInput.files[0]) {
        payload.append('photo', reviewPhotoInput.files[0]);
      }

      try {
        const res = await fetch(`${API_BASE}/products/${currentProduct.id}/reviews`, {
          method: 'POST',
          body: payload
        });

        if (!res.ok) throw new Error('Failed to submit review');

        const newReview = await res.json();
        if (!currentProduct.reviews) currentProduct.reviews = [];
        currentProduct.reviews.push(newReview);

        reviewForm.reset();
        reviewPhotoPreview.hidden = true;
        reviewPhotoLabelText.textContent = 'Add a photo (optional)';
        renderReviews();
        showToast('Review submitted successfully!');
      } catch (err) {
        showToast('Error submitting review');
      } finally {
        btn.textContent = 'Submit Review';
        btn.disabled = false;
      }
    });
  }

  // ===== AUTHENTICATION & PROFILE =====
  const authModal = document.getElementById('auth-modal');
  const authModalOverlay = document.getElementById('auth-modal-overlay');
  const profileModal = document.getElementById('profile-modal');
  const profileModalOverlay = document.getElementById('profile-modal-overlay');
  
  document.addEventListener('click', (e) => {
    const accountBtn = e.target.closest('a[aria-label="Account"]');
    if (accountBtn) {
      e.preventDefault();
      const currentUser = localStorage.getItem('brushUser');
      if (currentUser) {
        openProfileModal(JSON.parse(currentUser));
      } else {
        openAuthModal();
      }
    }
    
    const ordersBtn = e.target.closest('a[aria-label="Orders"]');
    if (ordersBtn) {
      e.preventDefault();
      const currentUser = localStorage.getItem('brushUser');
      if (currentUser) {
        openOrdersModal(JSON.parse(currentUser));
      } else {
        openAuthModal();
        showToast('Please login to check order details.');
      }
    }
  });

  function updateAuthUI() {
    const btn = document.querySelector('a[aria-label="Account"]');
    if (!btn) return;
    const currentUser = localStorage.getItem('brushUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span style="font-size: 0.8rem; margin-left: 5px;">Hi, ${user.name || user.userId}</span>`;
    } else {
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    }
  }

  // Initial call on page load
  updateAuthUI();

  // Arrived here via checkout.html's "log in to continue" link (checkout
  // doesn't load this script, so it can't open the modal itself) - open
  // straight into it instead of leaving the visitor to find the account
  // icon on their own, then drop the param so a refresh doesn't reopen it.
  if (new URLSearchParams(window.location.search).get('login') === '1' && !localStorage.getItem('brushUser')) {
    openAuthModal();
    history.replaceState(null, '', window.location.pathname + window.location.hash);
  }

  function openAuthModal() {
    if(authModal) authModal.classList.add('open');
    if(authModalOverlay) authModalOverlay.classList.add('open');
  }
  function closeAuthModal() {
    if(authModal) authModal.classList.remove('open');
    if(authModalOverlay) authModalOverlay.classList.remove('open');
  }
  
  const authCloseBtn = document.getElementById('auth-close-btn');
  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
  if (authModalOverlay) authModalOverlay.addEventListener('click', closeAuthModal);

  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(t => t.classList.remove('active'));
      authForms.forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.target}-form`).classList.add('active');
    });
  });

  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('login-id').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id, password})
        });
        const data = await res.json();
        if(res.ok) {
          localStorage.setItem('brushUser', JSON.stringify(data));
          closeAuthModal();
          updateAuthUI();
          showToast('Logged in successfully!');
        } else {
          loginError.textContent = data.error || 'Login failed';
        }
      } catch (err) {
        loginError.textContent = 'Network error';
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('signup-id').value;
      const name = document.getElementById('signup-name').value;
      const phone = document.getElementById('signup-phone').value;
      const address = document.getElementById('signup-address').value;
      const password = document.getElementById('signup-password').value;
      
      try {
        const res = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id, name, phone, address, password})
        });
        const data = await res.json();
        if(res.ok) {
          localStorage.setItem('brushUser', JSON.stringify(data));
          closeAuthModal();
          showToast('Account created successfully!');
        } else {
          signupError.textContent = data.error || 'Signup failed';
        }
      } catch (err) {
        signupError.textContent = 'Network error';
      }
    });
  }

  // Forgot Password / Reset Logic
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const backToLoginLink = document.getElementById('back-to-login-link');
  const resetForm = document.getElementById('reset-form');

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', () => {
      authTabs.forEach(t => t.classList.remove('active'));
      authForms.forEach(f => f.classList.remove('active'));
      resetForm.classList.add('active');
    });
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', () => {
      authForms.forEach(f => f.classList.remove('active'));
      document.getElementById('login-form').classList.add('active');
      const loginTab = document.querySelector('.auth-tab[data-target="login"]');
      if (loginTab) loginTab.classList.add('active');
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('reset-id').value;
      const err = document.getElementById('reset-error');
      const btn = resetForm.querySelector('button');

      btn.textContent = 'Sending...';
      btn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset link');

        err.style.color = 'var(--success)';
        err.textContent = 'If an account exists for that ID, a password reset link has been emailed to it.';
        resetForm.reset();
      } catch (error) {
        err.style.color = 'var(--sale-red)';
        err.textContent = error.message;
      } finally {
        btn.textContent = 'Send Reset Link';
        btn.disabled = false;
      }
    });
  }

  // Profile Modal
  function closeProfileModal() {
    if(profileModal) profileModal.classList.remove('open');
    if(profileModalOverlay) profileModalOverlay.classList.remove('open');
  }
  
  const profileCloseBtn = document.getElementById('profile-close-btn');
  if(profileCloseBtn) profileCloseBtn.addEventListener('click', closeProfileModal);
  if(profileModalOverlay) profileModalOverlay.addEventListener('click', closeProfileModal);

  // A 401 here means the session token is missing or no longer valid - either
  // a pre-existing login from before session tokens existed, or one that's
  // outlived a server restart (tokens are held in memory, not persisted).
  // Surfacing that as a real "log in again" prompt instead of a bare
  // "failed to load" message.
  function handleSessionExpiry() {
    localStorage.removeItem('brushUser');
    closeProfileModal();
    closeOrdersModal();
    showToast('Your session has expired. Please log in again.');
    openAuthModal();
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      const user = JSON.parse(localStorage.getItem('brushUser') || 'null');
      if (user && user.token) {
        fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}` }
        }).catch(() => {}); // best-effort - local logout proceeds regardless
      }
      localStorage.removeItem('brushUser');
      closeProfileModal();
      showToast('Logged out');
    });
  }

  async function openProfileModal(user) {
    if(profileModal) profileModal.classList.add('open');
    if(profileModalOverlay) profileModalOverlay.classList.add('open');
    
    document.getElementById('profile-id').value = user.userId;
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-address').value = user.address || '';
    document.getElementById('profile-msg').textContent = '';
  }

  // Orders Modal
  const ordersModal = document.getElementById('orders-modal');
  const ordersModalOverlay = document.getElementById('orders-modal-overlay');

  function closeOrdersModal() {
    if(ordersModal) ordersModal.classList.remove('open');
    if(ordersModalOverlay) ordersModalOverlay.classList.remove('open');
  }

  const ordersCloseBtn = document.getElementById('orders-close-btn');
  if(ordersCloseBtn) ordersCloseBtn.addEventListener('click', closeOrdersModal);
  if(ordersModalOverlay) ordersModalOverlay.addEventListener('click', closeOrdersModal);

  // Close on Escape - same convention as the cart drawer, search overlay,
  // and product modal. None of these three had it either.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (authModal && authModal.classList.contains('open')) closeAuthModal();
    if (profileModal && profileModal.classList.contains('open')) closeProfileModal();
    if (ordersModal && ordersModal.classList.contains('open')) closeOrdersModal();
  });

  async function openOrdersModal(user) {
    if(ordersModal) ordersModal.classList.add('open');
    if(ordersModalOverlay) ordersModalOverlay.classList.add('open');
    
    // Fetch orders
    const orderList = document.getElementById('orders-history-list');
    if (!orderList) return;
    
    orderList.innerHTML = '<p>Loading orders...</p>';
    try {
      const res = await fetch(`${API_BASE}/orders/user/${user.userId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if(res.ok) {
        const orders = await res.json();
        if(orders.length === 0) {
          orderList.innerHTML = '<p>No orders found.</p>';
        } else {
          orderList.innerHTML = orders.map(o => `
            <div class="order-item" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <strong>${o.orderId}</strong>
                <span style="color:var(--accent); font-weight: 600;">₹${o.total}</span>
              </div>
              <div style="font-size:0.85rem;color:var(--text-secondary);">
                Date: ${new Date(o.createdAt?._seconds ? o.createdAt._seconds*1000 : (o.createdAt || new Date())).toLocaleDateString()} | Status: <span style="font-weight: 500; color: ${o.status === 'Cancelled' ? 'var(--sale-red)' : 'var(--text-primary)'}">${o.status}</span>
              </div>
              <div style="font-size:0.85rem;margin-top:5px; color:var(--text-primary);">
                ${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>
          `).join('');
        }
      } else if (res.status === 401) {
        handleSessionExpiry();
      } else {
        orderList.innerHTML = '<p>Failed to load orders.</p>';
      }
    } catch(err) {
      orderList.innerHTML = '<p>Error loading orders.</p>';
    }
  }

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = JSON.parse(localStorage.getItem('brushUser'));
      if(!user) return;
      
      const name = document.getElementById('profile-name').value;
      const phone = document.getElementById('profile-phone').value;
      const address = document.getElementById('profile-address').value;
      
      try {
        const res = await fetch(`${API_BASE}/auth/profile/${user.userId}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}`},
          body: JSON.stringify({name, phone, address})
        });
        if(res.ok) {
          user.name = name;
          user.phone = phone;
          user.address = address;
          localStorage.setItem('brushUser', JSON.stringify(user));
          document.getElementById('profile-msg').textContent = 'Profile updated!';
          document.getElementById('profile-msg').style.color = 'green';
        } else if (res.status === 401) {
          handleSessionExpiry();
        } else {
          document.getElementById('profile-msg').textContent = 'Update failed';
          document.getElementById('profile-msg').style.color = 'red';
        }
      } catch (err) {
        document.getElementById('profile-msg').textContent = 'Network error';
        document.getElementById('profile-msg').style.color = 'red';
      }
    });
  }

  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = JSON.parse(localStorage.getItem('brushUser'));
      if (!currentUser) return;
      
      const currentPassword = document.getElementById('current-profile-password').value;
      const newPassword = document.getElementById('new-profile-password').value;
      const msg = document.getElementById('change-password-msg');
      const btn = changePasswordForm.querySelector('button');

      btn.textContent = 'Updating...';
      btn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        if (res.status === 401) {
          handleSessionExpiry();
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');

        msg.style.color = 'var(--success)';
        msg.textContent = 'Password updated successfully!';
        changePasswordForm.reset();
        setTimeout(() => { msg.textContent = ''; }, 3000);
      } catch (error) {
        msg.style.color = 'var(--sale-red)';
        msg.textContent = error.message;
      } finally {
        btn.textContent = 'Update Password';
        btn.disabled = false;
      }
    });
  }

  // FAQ Accordion
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      // Close all other FAQs
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Toggle current FAQ
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });

});

// --- Content Protection ---

// Prevent Right Click
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

// Prevent Dragging of Images
document.addEventListener('dragstart', function(e) {
  if (e.target.tagName.toLowerCase() === 'img') {
    e.preventDefault();
  }
});

// Prevent common save/print/screenshot shortcuts
document.addEventListener('keydown', function(e) {
  // Prevent Ctrl+S / Cmd+S (Save)
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
  }
  
  // Prevent Ctrl+P / Cmd+P (Print)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
    e.preventDefault();
  }

  // Prevent PrintScreen (Windows)
  if (e.key === 'PrintScreen') {
    navigator.clipboard.writeText('');
    e.preventDefault();
  }
  
  // Prevent Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5 (Mac Screenshots)
  if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
    // Blank the screen briefly to disrupt the screenshot
    const originalDisplay = document.body.style.display;
    document.body.style.display = 'none';
    setTimeout(() => { document.body.style.display = originalDisplay; }, 1500);
  }
});

// Extra precaution for PrintScreen
document.addEventListener('keyup', (e) => {
  if (e.key === 'PrintScreen') {
    navigator.clipboard.writeText('');
  }
});

// =========================================
// Reach Out Modals Logic
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  const reachoutOverlay = document.getElementById('reachout-modal-overlay');
  const reachoutModals = document.querySelectorAll('.reachout-modal');

  window.closeReachoutModals = function() {
    if (reachoutOverlay) reachoutOverlay.classList.remove('active');
    reachoutModals.forEach(m => m.classList.remove('active'));
  };

  if (reachoutOverlay) {
    // Open buttons
    document.querySelectorAll('.reachout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-modal');
        const targetModal = document.getElementById(targetId);
        if (targetModal) {
          reachoutOverlay.classList.add('active');
          targetModal.classList.add('active');
        }
      });
    });

    // Close buttons inside modals
    document.querySelectorAll('.reachout-close-btn').forEach(btn => {
      btn.addEventListener('click', closeReachoutModals);
    });

    // Close on overlay click
    reachoutOverlay.addEventListener('click', closeReachoutModals);
  }
});
