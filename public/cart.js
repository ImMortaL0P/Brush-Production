// ========================================
// BRUSH — Cart System
// ========================================

const Cart = (() => {
  const STORAGE_KEY = 'brush_cart';
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5500/api' : 'https://brush-production.onrender.com/api';
  let listeners = [];

  // Canonical per-product-type variant config — must stay in sync with
  // Backend/productTypes.js (browser code can't require that Node module
  // without a bundler). Server recomputes price from this same shape
  // independently and never trusts what the client sends; this copy only
  // drives the UI (swatch options shown, cart line labels, client-side
  // price preview before checkout).
  const PRODUCT_TYPES = {
    poster: {
      label: 'Poster',
      variantGroups: [
        { key: 'size', label: 'Size', options: [
          { value: 'A4', label: 'A4', priceDelta: 0 },
          { value: 'A5', label: 'A5', priceDelta: -20 },
          { value: 'A3', label: 'A3', priceDelta: 50 }
        ]},
        { key: 'gsm', label: 'Paper Quality', options: [
          { value: '80', label: '80 GSM', priceDelta: 0 },
          { value: '140', label: '140 GSM', priceDelta: 40 }
        ]}
      ]
    },
    plate: {
      label: 'Decorative Plate',
      variantGroups: [
        { key: 'size', label: 'Plate Size', options: [
          { value: '8in', label: '8" Round', priceDelta: 0 },
          { value: '10in', label: '10" Round', priceDelta: 80 },
          { value: '12in', label: '12" Round', priceDelta: 150 }
        ]}
      ]
    },
    wallpaper: {
      label: 'Wallpaper',
      variantGroups: [
        { key: 'roll', label: 'Roll Size', options: [
          { value: '1x3m', label: '1m × 3m Roll', priceDelta: 0 },
          { value: '1.5x3m', label: '1.5m × 3m Roll', priceDelta: 300 }
        ]}
      ]
    }
  };

  function typeConfigFor(productType) {
    return PRODUCT_TYPES[productType] || PRODUCT_TYPES.poster;
  }

  function defaultVariants(productType) {
    const variants = {};
    typeConfigFor(productType).variantGroups.forEach(group => {
      variants[group.key] = group.options[0].value;
    });
    return variants;
  }

  // ---- State ----
  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // Migrates items added before multi-product-type support (flat
      // `size`/`gsm`, no `variants`/`productType`) so every downstream
      // consumer only ever has to handle one shape.
      let migrated = false;
      cart.forEach(item => {
        if (!item.variants) {
          item.productType = item.productType || 'poster';
          item.variants = { size: item.size || 'A4', gsm: item.gsm || '80' };
          migrated = true;
        }
      });
      if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      return cart;
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    notifyListeners();
  }

  function notifyListeners() {
    const cart = getCart();
    listeners.forEach(fn => fn(cart));
  }

  // ---- Public API ----
  // `variants` is a plain object keyed by that product type's variant
  // groups, e.g. {size:'A3', gsm:'140'} for a poster or {size:'10in'} for
  // a plate — pass null/omit to use the type's first (base-price) option
  // in every group, same as before for the quick-add-from-card path.
  function addItem(product, qty = 1, variants = null, finalPrice = null) {
    const cart = getCart();
    const productType = product.productType || 'poster';
    const resolvedVariants = variants || defaultVariants(productType);
    const cartId = `${product.id}_${Object.values(resolvedVariants).join('_')}`;
    const priceToUse = finalPrice !== null ? finalPrice : product.price;
    const existing = cart.find(item => item.cartId === cartId);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, existing.stockQuantity || 50);
    } else {
      cart.push({
        cartId,
        id: product.id,
        name: product.name,
        price: priceToUse,
        originalPrice: product.originalPrice || product.price,
        image: product.image,
        quantity: qty,
        productType,
        variants: resolvedVariants,
        stockQuantity: product.stockQuantity !== undefined ? product.stockQuantity : 50
      });
    }
    saveCart(cart);
    return cart;
  }

  function removeItem(cartId) {
    // support legacy id or cartId
    const cart = getCart().filter(item => item.cartId !== cartId && item.id !== cartId);
    saveCart(cart);
    return cart;
  }

  function updateQuantity(cartId, qty) {
    const cart = getCart();
    const item = cart.find(i => i.cartId === cartId || i.id === cartId);
    if (item) {
      const maxStock = item.stockQuantity || 50;
      item.quantity = Math.max(1, Math.min(qty, maxStock));
    }
    saveCart(cart);
    return cart;
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  }

  function getItemCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  function getSubtotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function getSavings() {
    return getCart().reduce((sum, item) => sum + ((item.originalPrice - item.price) * item.quantity), 0);
  }

  function getShipping() {
    const subtotal = getSubtotal();
    if (subtotal === 0) return 0;
    return subtotal >= 500 ? 0 : 49;
  }

  function getDiscount() {
    const subtotal = getSubtotal();
    return subtotal >= 1000 ? Math.round(subtotal * 0.1) : 0;
  }

  function getTotal() {
    return getSubtotal() + getShipping() - getDiscount();
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  // ---- Order placement ----
  async function placeOrder(customerData, paymentMethod, rzpOrderId = null, rzpPaymentId = null, rzpSignature = null) {
    const cart = getCart();
    if (cart.length === 0) throw new Error('Cart is empty');

    let userId = null;
    try {
      const u = JSON.parse(localStorage.getItem('brushUser'));
      if(u) userId = u.userId;
    } catch(e) {}

    const orderPayload = {
      customer: customerData,
      userId: userId,
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        variants: item.variants
      })),
      paymentMethod: paymentMethod,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: rzpSignature
    };

    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to place order');
    }

    // Clear cart on success
    clear();
    return data;
  }

  async function getOrder(orderId) {
    const response = await fetch(`${API_BASE}/orders/${orderId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Order not found');
    return data;
  }

  return {
    getCart, addItem, removeItem, updateQuantity, clear,
    getItemCount, getSubtotal, getSavings, getShipping, getDiscount, getTotal,
    onChange, placeOrder, getOrder,
    PRODUCT_TYPES, typeConfigFor, defaultVariants
  };
})();
