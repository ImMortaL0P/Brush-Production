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
  // PRODUCT FETCHING & RENDERING
  // ========================================
  
  async function loadProducts() {
    const productList = document.getElementById('product-list');
    const scrollTrack = document.getElementById('scroll-track');
    
    if (!productList && !scrollTrack) return;
    
    try {
      const res = await fetch('http://localhost:5500/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const products = await res.json();
      
      // Split products: first half for best sellers, second half for new arrivals (or randomly)
      const bestSellers = products.slice(0, Math.ceil(products.length / 2));
      const newArrivals = products.slice(Math.ceil(products.length / 2));
      
      const createProductCard = (p, delayIndex = 0, badge = 'Sale', badgeBg = '') => {
        const delayClass = delayIndex > 0 ? `fade-in-delay-${delayIndex}` : '';
        const badgeStyle = badgeBg ? `style="background: ${badgeBg}; color: var(--bg-primary);"` : '';
        const discountPercentage = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
        
        return `
          <div class="product-card fade-in ${delayClass} visible" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-original="${p.originalPrice || p.price}" data-image="${p.image}">
            <div class="product-card-image">
              <img src="${p.image}" alt="${p.name}">
              <span class="product-badge" ${badgeStyle}>${p.badge || badge}</span>
              <div class="product-quick-actions">
                <button class="quick-add-btn">Add to Cart</button>
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

      if (productList) {
        productList.innerHTML = bestSellers.map((p, i) => createProductCard(p, i % 4, 'Trending')).join('');
      }
      
      if (scrollTrack) {
        scrollTrack.innerHTML = newArrivals.map(p => createProductCard(p, 0, 'New', 'var(--accent)')).join('');
      }
      
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
      <div class="cart-item" data-cart-id="${item.cartId || item.id}">
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          ${item.size ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">Size: ${item.size} | Paper: ${item.gsm} GSM</div>` : ''}
          <div class="cart-item-price">
            <strong>₹${item.price}</strong> × ${item.quantity} = ₹${item.price * item.quantity}
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-minus" data-id="${item.cartId || item.id}" aria-label="Decrease quantity">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-plus" data-id="${item.cartId || item.id}" aria-label="Increase quantity">+</button>
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
          Cart.updateQuantity(id, item.quantity + 1);
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

  // Attach to all "Add to Cart" / "Quick Add" buttons and Product Modals
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-add-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      handleAddToCart(btn);
      return;
    }
    
    const card = e.target.closest('.product-card');
    if (card) {
      e.preventDefault();
      openProductModal(card.dataset.id);
    }
  });


  // ========================================
  // PRODUCT MODAL SYSTEM
  // ========================================
  const productModal = document.getElementById('product-modal');
  const productModalOverlay = document.getElementById('product-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  let currentProduct = null;

  async function openProductModal(productId) {
    productModal.classList.add('open');
    productModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    try {
      const res = await fetch(`http://localhost:5500/api/products/${productId}`);
      if (!res.ok) throw new Error('Product not found');
      currentProduct = await res.json();
      
      document.getElementById('modal-image').src = currentProduct.image;
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
      
      // reset selectors
      document.getElementById('size-selector').value = 'A4';
      document.getElementById('gsm-selector').value = '80';
      
      updateModalPrice();
      renderReviews();
    } catch (err) {
      console.error(err);
      showToast('Failed to load product details');
      closeProductModal();
    }
  }

  function closeProductModal() {
    productModal.classList.remove('open');
    productModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentProduct = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);
  if (productModalOverlay) productModalOverlay.addEventListener('click', closeProductModal);

  function updateModalPrice() {
    if (!currentProduct) return;
    
    let basePrice = currentProduct.price;
    const sizeSelect = document.getElementById('size-selector');
    const gsmSelect = document.getElementById('gsm-selector');
    
    const sizeExtra = parseInt(sizeSelect.options[sizeSelect.selectedIndex].dataset.price);
    const gsmExtra = parseInt(gsmSelect.options[gsmSelect.selectedIndex].dataset.price);
    
    let finalPrice = basePrice + sizeExtra + gsmExtra;
    if (finalPrice < 10) finalPrice = 10;
    
    document.getElementById('modal-price').textContent = `₹${finalPrice}`;
    document.getElementById('modal-btn-price').textContent = `₹${finalPrice}`;
  }

  const sizeSelector = document.getElementById('size-selector');
  const gsmSelector = document.getElementById('gsm-selector');
  if (sizeSelector) sizeSelector.addEventListener('change', updateModalPrice);
  if (gsmSelector) gsmSelector.addEventListener('change', updateModalPrice);

  const modalAddToCartBtn = document.getElementById('modal-add-to-cart');
  if (modalAddToCartBtn) {
    modalAddToCartBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      if (currentProduct.stockQuantity !== undefined && currentProduct.stockQuantity <= 0) {
        showToast('Sorry, this product is currently out of stock.');
        return;
      }
      
      const size = sizeSelector.value;
      const gsm = gsmSelector.value;
      const finalPrice = parseInt(document.getElementById('modal-price').textContent.replace('₹', ''));
      
      Cart.addItem(currentProduct, 1, size, gsm, finalPrice);
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
    
    list.innerHTML = reviews.map(r => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${r.user}</span>
          <span class="review-date">${new Date(r.date).toLocaleDateString()}</span>
        </div>
        <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <p class="review-text">${r.comment}</p>
      </div>
    `).join('');
  }

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentProduct) return;
      
      const btn = reviewForm.querySelector('button');
      btn.textContent = 'Submitting...';
      btn.disabled = true;
      
      const payload = {
        user: document.getElementById('review-name').value,
        rating: document.getElementById('review-rating').value,
        comment: document.getElementById('review-comment').value
      };
      
      try {
        const res = await fetch(`http://localhost:5500/api/products/${currentProduct.id}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Failed to submit review');
        
        const newReview = await res.json();
        if (!currentProduct.reviews) currentProduct.reviews = [];
        currentProduct.reviews.push(newReview);
        
        reviewForm.reset();
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

});
