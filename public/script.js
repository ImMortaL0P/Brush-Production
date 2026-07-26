// ========================================
// BRUSH — Main Script
// ========================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Navbar scroll effect ----
  const navbar = document.getElementById('navbar');
  const announcementBar = document.getElementById('announcement-bar');

  function handleNavbarScroll() {
    const scrollY = window.scrollY;
    const barHeight = announcementBar ? announcementBar.offsetHeight : 0;

    if (scrollY > 10) {
      navbar.classList.add('scrolled');
      navbar.style.top = '0';
    } else {
      navbar.classList.remove('scrolled');
      navbar.style.top = barHeight + 'px';
    }
  }

  if (announcementBar) {
    navbar.style.top = announcementBar.offsetHeight + 'px';
  }
  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll();


  // ---- Mobile menu toggle ----
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
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


  // ---- Horizontal scroll (New Arrivals) ----
  const scrollTrack = document.getElementById('scroll-track');
  const scrollPrev = document.getElementById('scroll-prev');
  const scrollNext = document.getElementById('scroll-next');

  if (scrollTrack && scrollPrev && scrollNext) {
    const scrollAmount = 310;

    scrollNext.addEventListener('click', () => {
      scrollTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    scrollPrev.addEventListener('click', () => {
      scrollTrack.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
  }


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
  const fadeElements = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));
  } else {
    fadeElements.forEach(el => el.classList.add('visible'));
  }


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
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });


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
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Cart icon in navbar opens drawer
  const cartNavBtn = document.querySelector('.nav-action-btn[aria-label="Cart"]');
  if (cartNavBtn) {
    cartNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
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
      <div class="cart-item" data-cart-id="${item.id}">
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <div class="cart-item-price">
            <strong>₹${item.price}</strong> × ${item.quantity} = ₹${item.price * item.quantity}
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-minus" data-id="${item.id}" aria-label="Decrease quantity">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove item">
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
        const id = parseInt(btn.dataset.id);
        const item = Cart.getCart().find(i => i.id === id);
        if (item && item.quantity > 1) {
          Cart.updateQuantity(id, item.quantity - 1);
        } else {
          Cart.removeItem(id);
        }
      });
    });

    cartBody.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const item = Cart.getCart().find(i => i.id === id);
        if (item) {
          Cart.updateQuantity(id, item.quantity + 1);
        }
      });
    });

    cartBody.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.removeItem(parseInt(btn.dataset.id));
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
      image: card.dataset.image
    };

    if (!product.id || !product.name) return;

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

  // Attach to all "Add to Cart" / "Quick Add" buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-add-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      handleAddToCart(btn);
    }
  });

});
