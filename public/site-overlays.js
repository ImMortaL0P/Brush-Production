// ========================================
// BRUSH — Shared overlays (<site-overlays>)
//
// Search overlay, auth / profile / orders modals, product detail modal,
// cart drawer, toast and scroll-to-top — the markup script.js drives.
// It used to be copy-pasted into every page that loads script.js and had
// started to drift between copies; now there is one source. Rendered
// synchronously when the element is parsed, so it exists before script.js
// (loaded after it) looks anything up by id.
// ========================================
(function () {
  class SiteOverlays extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered) return;
      this.dataset.rendered = '1';
      this.innerHTML = `
        <!-- Search Overlay -->
        <div class="search-overlay" id="search-overlay">
          <div class="search-container" role="dialog" aria-modal="true" aria-label="Search">
            <button type="button" class="search-close-btn" id="search-close-btn" aria-label="Close search"><i class="fa-solid fa-xmark"></i></button>
            <form id="global-search-form" class="global-search-form" role="search">
              <input type="search" id="global-search-input" placeholder="Search posters, categories, themes..." autocomplete="off" aria-label="Search products">
              <button type="submit" aria-label="Submit search"><i class="fa-solid fa-magnifying-glass"></i></button>
            </form>
            <div class="search-suggestions" id="search-suggestions" data-lenis-prevent></div>
          </div>
        </div>

        <!-- Auth Modal -->
        <div class="auth-modal-overlay" id="auth-modal-overlay"></div>
        <div class="auth-modal" id="auth-modal" role="dialog" aria-modal="true" aria-label="Log in or sign up">
          <button type="button" class="auth-close-btn" id="auth-close-btn" aria-label="Close modal"><i class="fa-solid fa-xmark"></i></button>
          <div class="auth-tabs">
            <button type="button" class="auth-tab active" data-target="login">Log In</button>
            <button type="button" class="auth-tab" data-target="signup">Sign Up</button>
          </div>

          <!-- Login Form -->
          <form class="auth-form active" id="login-form">
            <h3>Welcome Back</h3>
            <div class="form-group">
              <label for="login-id">Email or Phone</label>
              <input type="text" id="login-id" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" autocomplete="current-password" required>
            </div>
            <div class="auth-link-row auth-link-row--end">
              <button type="button" class="auth-link" id="forgot-password-link">Forgot Password?</button>
            </div>
            <button type="submit" class="auth-submit-btn">Log In</button>
            <div class="auth-error" id="login-error"></div>
          </form>

          <!-- Reset Password Form -->
          <form class="auth-form" id="reset-form">
            <h3>Reset Password</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">Enter the email you signed up with and we'll send you a link to reset your password.</p>
            <div class="form-group">
              <label for="reset-id">Email or Phone</label>
              <input type="text" id="reset-id" autocomplete="username" required>
            </div>
            <button type="submit" class="auth-submit-btn">Send Reset Link</button>
            <div class="auth-error" id="reset-error"></div>
            <div class="auth-link-row">
              <button type="button" class="auth-link auth-link--muted" id="back-to-login-link">Back to Log In</button>
            </div>
          </form>

          <!-- Signup Form -->
          <form class="auth-form" id="signup-form">
            <h3>Create an Account</h3>
            <div class="form-group">
              <label for="signup-id">Email or Phone</label>
              <input type="text" id="signup-id" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label for="signup-name">Full Name</label>
              <input type="text" id="signup-name" autocomplete="name" required>
            </div>
            <div class="form-group">
              <label for="signup-phone">Phone Number (if email used as ID)</label>
              <input type="tel" id="signup-phone" autocomplete="tel" inputmode="tel">
            </div>
            <div class="form-group">
              <label for="signup-address">Address</label>
              <textarea id="signup-address" rows="2" autocomplete="street-address"></textarea>
            </div>
            <div class="form-group">
              <label for="signup-password">Password</label>
              <input type="password" id="signup-password" autocomplete="new-password" minlength="8" required>
            </div>
            <button type="submit" class="auth-submit-btn">Sign Up</button>
            <div class="auth-error" id="signup-error"></div>
          </form>
        </div>

        <!-- Profile Modal -->
        <div class="profile-modal-overlay" id="profile-modal-overlay"></div>
        <div class="profile-modal" id="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" data-lenis-prevent>
          <button type="button" class="profile-close-btn" id="profile-close-btn" aria-label="Close profile"><i class="fa-solid fa-xmark"></i></button>
          <h2 id="profile-modal-title">My Account</h2>
          <div class="profile-content">
            <form id="profile-form">
              <h4>Personal Details</h4>
              <div class="form-group">
                <label for="profile-id">ID (Email/Phone)</label>
                <input type="text" id="profile-id" readonly disabled>
              </div>
              <div class="form-group">
                <label for="profile-name">Full Name</label>
                <input type="text" id="profile-name" autocomplete="name">
              </div>
              <div class="form-group">
                <label for="profile-phone">Phone Number</label>
                <input type="tel" id="profile-phone" autocomplete="tel">
              </div>
              <div class="form-group">
                <label for="profile-address">Address</label>
                <textarea id="profile-address" rows="3" autocomplete="street-address"></textarea>
              </div>
              <button type="submit" class="auth-submit-btn">Update Profile</button>
              <div class="auth-error auth-success" id="profile-msg" role="status"></div>
            </form>

            <form id="change-password-form" class="profile-subform">
              <h4>Change Password</h4>
              <div class="form-group">
                <label for="current-profile-password">Current Password</label>
                <input type="password" id="current-profile-password" autocomplete="current-password" required>
              </div>
              <div class="form-group">
                <label for="new-profile-password">New Password</label>
                <input type="password" id="new-profile-password" autocomplete="new-password" minlength="8" required>
              </div>
              <button type="submit" class="auth-submit-btn auth-submit-btn--secondary">Update Password</button>
              <div class="auth-error" id="change-password-msg"></div>
            </form>

            <button type="button" id="logout-btn" class="logout-btn">Log Out</button>
          </div>
        </div>

        <!-- Orders Modal -->
        <div class="profile-modal-overlay" id="orders-modal-overlay"></div>
        <div class="profile-modal" id="orders-modal" role="dialog" aria-modal="true" aria-labelledby="orders-modal-title" data-lenis-prevent>
          <button type="button" class="modal-close-btn" id="orders-close-btn" aria-label="Close modal"><i class="fa-solid fa-xmark"></i></button>
          <div class="auth-box">
            <h2 id="orders-modal-title" class="orders-modal-title">Your Orders</h2>
            <div class="order-history-section">
              <div id="orders-history-list">
                <!-- Orders injected here -->
              </div>
            </div>
          </div>
        </div>

        <!-- Product Detail Modal -->
        <div class="product-modal-overlay" id="product-modal-overlay"></div>
        <div class="product-modal" id="product-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-lenis-prevent>
          <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Close modal"><i class="fa-solid fa-xmark"></i></button>
          <div class="modal-content-wrapper">
            <div class="modal-image-col">
              <img id="modal-image" alt="">
            </div>
            <div class="modal-info-col">
              <h2 id="modal-title">Product Title</h2>
              <div class="modal-price-wrap">
                <span class="modal-price" id="modal-price">₹0</span>
                <span class="modal-original-price" id="modal-original-price"></span>
              </div>
              <p id="modal-stock-status" class="modal-stock-status"></p>
              <p class="modal-description" id="modal-description">Product description goes here.</p>

              <div class="variant-selectors" id="variant-selectors">
                <!-- Populated per-product by renderVariantSelectors() in script.js
                     — a poster gets Size/Paper Quality, a plate gets Plate Size,
                     a wallpaper gets Roll Size, all from the same shared config
                     Cart.js and the server both read (Backend/productTypes.js). -->
              </div>

              <button type="button" class="modal-add-to-cart" id="modal-add-to-cart">Add to Cart - <span id="modal-btn-price">₹0</span></button>


              <div class="product-accordions">
                <details class="product-accordion">
                  <summary>Description & Material</summary>
                  <div class="accordion-content">
                    <p>Premium quality finishes designed for lasting durability. We exclusively use eco-friendly inks and sustainable sourcing for all our materials to ensure they are safe for any indoor setting.</p>
                  </div>
                </details>
                <details class="product-accordion">
                  <summary>Shipping & Delivery</summary>
                  <div class="accordion-content">
                    <p>Printed to order and dispatched within 1–2 business days, securely packed in heavy-duty tubes or reinforced flat-packs. Flat ₹54 shipping across India with tracked delivery.</p>
                  </div>
                </details>
                <details class="product-accordion">
                  <summary>Quality & Installation</summary>
                  <div class="accordion-content">
                    <ul class="accordion-list">
                      <li>Ready-to-hang or easy-to-install formats.</li>
                      <li>Precision printing for high-contrast brilliance.</li>
                      <li>Made to order ensuring absolute quality control.</li>
                    </ul>
                  </div>
                </details>
              </div>

              <div class="reviews-section">
                <h3>Customer Reviews (<span id="review-count">0</span>)</h3>
                <div class="reviews-list" id="reviews-list" data-lenis-prevent>
                  <!-- Reviews injected here -->
                </div>

                <form class="review-form" id="review-form">
                  <h4>Write a Review</h4>
                  <input type="text" id="review-name" placeholder="Your Name" aria-label="Your name" autocomplete="name" required>
                  <div class="star-input" role="radiogroup" aria-label="Your rating">
                    <div class="star-input-stars">
                      <input type="radio" name="review-stars" id="rs-5" value="5"><label for="rs-5" title="Loved it"><span class="sr-only">5 stars</span></label>
                      <input type="radio" name="review-stars" id="rs-4" value="4"><label for="rs-4" title="Great"><span class="sr-only">4 stars</span></label>
                      <input type="radio" name="review-stars" id="rs-3" value="3"><label for="rs-3" title="Good"><span class="sr-only">3 stars</span></label>
                      <input type="radio" name="review-stars" id="rs-2" value="2"><label for="rs-2" title="Fair"><span class="sr-only">2 stars</span></label>
                      <input type="radio" name="review-stars" id="rs-1" value="1"><label for="rs-1" title="Poor"><span class="sr-only">1 star</span></label>
                    </div>
                    <span class="star-input-caption" id="star-input-caption">Tap a star to rate</span>
                    <input type="hidden" id="review-rating" value="">
                  </div>
                  <textarea id="review-comment" placeholder="What did you think?" aria-label="Your review" required></textarea>
                  <label class="review-photo-label" for="review-photo">
                    <i class="fa-solid fa-camera"></i> <span id="review-photo-label-text">Add a photo (optional)</span>
                  </label>
                  <input type="file" id="review-photo" accept="image/*" hidden>
                  <img class="review-photo-preview" id="review-photo-preview" alt="Review photo preview" hidden>
                  <button type="submit">Submit Review</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Cart Drawer -->
        <div class="cart-overlay" id="cart-overlay"></div>
        <div class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <div class="cart-drawer-header">
            <h3><i class="fa-solid fa-bag-shopping"></i> Your Cart <span class="cart-drawer-count" id="cart-drawer-count">(0)</span></h3>
            <button type="button" class="cart-close-btn" id="cart-close-btn" aria-label="Close cart"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="cart-drawer-body" id="cart-drawer-body" data-lenis-prevent>
            <!-- Rendered by JS -->
          </div>
          <div class="cart-drawer-footer" id="cart-drawer-footer">
            <div class="cart-summary-row">
              <span>Subtotal</span>
              <span class="cart-subtotal" id="cart-subtotal">₹0</span>
            </div>
            <div class="cart-summary-row">
              <span>GST</span>
              <span id="cart-gst">₹0</span>
            </div>
            <div class="cart-summary-row shipping-note" id="cart-shipping-note">
              <span>Shipping</span>
              <span id="cart-shipping">₹0</span>
            </div>
            <div class="cart-summary-row cart-total-row">
              <span>Total <small class="cart-total-note">(prepaid · COD adds ₹34 + GST)</small></span>
              <span class="cart-total" id="cart-total">₹0</span>
            </div>
            <a href="checkout.html" class="cart-checkout-btn" id="cart-checkout-btn">Proceed to Checkout →</a>
            <button type="button" class="cart-continue-btn" id="cart-continue-btn">Continue Shopping</button>
          </div>
        </div>

        <!-- Toast Notification -->
        <div class="toast" id="toast" role="status" aria-live="polite">
          <i class="fa-solid fa-check-circle" aria-hidden="true"></i>
          <span class="toast-text" id="toast-text">Added to cart!</span>
        </div>

        <!-- Scroll to Top -->
        <button type="button" class="scroll-top" id="scroll-top" aria-label="Scroll to top">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
      `;
    }
  }

  customElements.define('site-overlays', SiteOverlays);
})();
