// ========================================
// BRUSH — Cart System
// ========================================

const Cart = (() => {
  const STORAGE_KEY = 'brush_cart';
  const API_BASE = 'http://localhost:5500/api';
  let listeners = [];

  // ---- State ----
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
  function addItem(product, qty = 1) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice || product.price,
        image: product.image,
        quantity: qty
      });
    }
    saveCart(cart);
    return cart;
  }

  function removeItem(productId) {
    const cart = getCart().filter(item => item.id !== productId);
    saveCart(cart);
    return cart;
  }

  function updateQuantity(productId, qty) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity = Math.max(1, qty);
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
  async function placeOrder(customerData, paymentMethod) {
    const cart = getCart();
    if (cart.length === 0) throw new Error('Cart is empty');

    const orderPayload = {
      customer: customerData,
      items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
      paymentMethod: paymentMethod
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
    onChange, placeOrder, getOrder
  };
})();
