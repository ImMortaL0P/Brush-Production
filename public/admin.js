// ========================================
// BRUSH — Admin dashboard (admin.html)
//
// Orders, inventory, add product, pricing and the activity log. Talks to
// the same /api routes as before. Roles: superadmin (everything), stocker
// (stock quantities only), watcher (read-only) — the server enforces these;
// the UI mirrors them so nobody is shown a control that will be refused.
// ========================================
(function () {
  'use strict';

  // ---------- helpers ----------
  // Every value from a shopper (checkout fields, reviews) or the database
  // goes through this before innerHTML — an admin page runs with the
  // admin's session token, so injected markup would be dangerous here.
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const $ = (id) => document.getElementById(id);
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const STATUSES = ['confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
  const TYPES = [
    { key: 'posters', value: 'Posters', label: 'Poster' },
    { key: 'apparel', value: 'apparel', label: 'T-Shirt' },
    { key: 'stickers', value: 'Stickers', label: 'Sticker' },
    { key: 'wallpapers', value: 'Wallpapers', label: 'Wallpaper' },
    { key: 'collectibles', value: 'Collectibles', label: 'Collectible' },
  ];
  const BASE_CATEGORIES = ['Anime', 'Movies & TV', 'Minimalist', 'Cyberpunk', 'Space & Sci-Fi', 'Board Finish', 'Floral', 'Travel', 'Mythological', 'Original Movie Posters', 'Pop Culture', 'Gaming', 'Typography', 'Apparel', 'General'];
  const LOW_STOCK = 5;

  // Stored product types vary ('poster', 'Posters', undefined, 'wallpaper').
  // Comparing them raw made the type dropdown fall back to its first option
  // ("Posters") for wallpapers — and saving then re-typed them as posters.
  function typeKey(t) {
    const s = String(t || '').toLowerCase();
    if (!s || s.startsWith('poster')) return 'posters';
    if (s === 'apparel' || s.includes('shirt')) return 'apparel';
    if (s.startsWith('sticker')) return 'stickers';
    if (s.startsWith('wallpaper')) return 'wallpapers';
    if (s.startsWith('collectible')) return 'collectibles';
    if (s.startsWith('plate')) return 'plates';
    return s;
  }
  const typeMeta = (t) => TYPES.find(x => x.key === typeKey(t));
  const stockOf = (p) => Number(p.stockQuantity ?? p.stock ?? 0);
  const keywordsText = (k) => (Array.isArray(k) ? k.join(', ') : String(k || ''));

  function relTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const mins = Math.round((Date.now() - d) / 60000);
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const sameDay = d.toDateString() === new Date().toDateString();
    if (sameDay) return `Today, ${time}`;
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }) + `, ${time}`;
  }

  // Order items now carry a generic `variants` object (poster/plate/
  // wallpaper all have different variant groups) instead of the old
  // flat `size`/`gsm` fields — this reads either shape so historical
  // orders placed before that change still display correctly.
  function formatVariantLine(item) {
    if (item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length) {
      // Human labels from the shared rate table ("Classic Crew · 180 GSM",
      // "DTG", "12×18″") rather than raw codes like uc21 / dtg.
      const cfg = typeof Cart !== 'undefined' ? Cart.typeConfigFor(item.productType) : null;
      const labels = Object.entries(item.variants).map(([k, v]) => {
        const group = cfg && (cfg.variantGroups || []).find(g => g.key === k);
        const opt = group && group.options.find(o => o.value === v);
        return escapeHtml(opt ? opt.label : v);
      }).filter(Boolean);
      return labels.join(' | ') || 'N/A';
    }
    if (item.size || item.gsm) {
      return `${item.size || 'A4'} | ${item.gsm || '80'} GSM`;
    }
    return 'N/A';
  }


  // Posters / T-shirts are priced from the shared Qikink rate table
  // (Backend/productTypes.js, mirrored in cart.js) — their price can't be
  // edited per product here; everything else keeps a manual price.
  function isCatalogPriced(p) {
    return typeof Cart !== 'undefined' && typeof Cart.typeConfigFor(p.productType).basePrice === 'number';
  }

  // ---- Pricing view: every sellable variant, cost, shelf price, margin ----
  async function loadPricing() {
    const box = document.getElementById('pricing-content');
    box.innerHTML = '<p style="color:var(--text-secondary);">Loading…</p>';
    try {
      // Server copy is authoritative; fall back to the storefront's mirrored
      // copy (cart.js) if the backend is older than the /api/pricing route.
      let data = null;
      try {
        const res = await fetch(`${API_BASE}/pricing`);
        if (res.ok) data = await res.json();
      } catch (e) {}
      if (!data && typeof Cart !== 'undefined') data = { productTypes: Cart.PRODUCT_TYPES, orderCharges: Cart.ORDER_CHARGES };
      if (!data) throw new Error('no pricing data');
      const { productTypes: T, orderCharges: C } = data;
      const inr = n => '₹' + (Number.isInteger(n) ? n : n.toFixed(2));
      const row = (label, cost, price, gst) => {
        const margin = price - cost;
        return `<tr><td>${label}</td><td style="text-align:right;">${inr(cost)}</td><td style="text-align:right; font-weight:700;">${inr(price)}</td><td style="text-align:right; color:var(--success);">${inr(margin)} (${(margin / cost * 100).toFixed(1)}%)</td><td style="text-align:right; color:var(--text-secondary);">${Math.round(gst * 100)}%</td></tr>`;
      };
      const head = '<thead><tr><th>Variant</th><th style="text-align:right;">Qikink cost</th><th style="text-align:right;">Brush price</th><th style="text-align:right;">Margin</th><th style="text-align:right;">GST</th></tr></thead>';

      const poster = T.poster;
      const posterRows = poster.variantGroups[0].options.map(o =>
        row(o.label, poster.qikinkCost.size[o.value], poster.basePrice + o.priceDelta, poster.gstRate)).join('');

      const ap = T.apparel;
      const styleG = ap.variantGroups.find(g => g.key === 'style');
      const printG = ap.variantGroups.find(g => g.key === 'print');
      const sizeG = ap.variantGroups.find(g => g.key === 'size');
      const apRows = [];
      styleG.options.forEach(st => printG.options.forEach(pr => {
        if (pr.onlyWith && !pr.onlyWith.style.includes(st.value)) return;
        const sizes = sizeG.options.filter(o => !o.onlyWith || o.onlyWith.style.includes(st.value)).map(o => o.label);
        apRows.push(row(`${st.label} · ${pr.label}<br><small style="color:var(--text-secondary);">${sizes.join(', ')}</small>`,
          ap.qikinkCost.style[st.value] + ap.qikinkCost.print[pr.value],
          ap.basePrice + st.priceDelta + pr.priceDelta, ap.gstRate));
      }));

      box.innerHTML = `
        <p style="color:var(--text-secondary); max-width:760px; line-height:1.5;">
          Shelf prices are Qikink product + printing cost plus a 15% Brush margin, rounded up. GST, shipping and the COD fee are added once per order at checkout.
          To change a price, edit <code>Backend/productTypes.js</code>, run <code>python3 tools/sync-cart-config.py</code>, and restart the backend — stored product prices update automatically on start.
        </p>
        <h3 style="margin:1.5rem 0 0.5rem;">Posters <small style="color:var(--text-secondary); font-weight:400;">300 GSM art board</small></h3>
        <div class="data-table-wrapper"><table>${head}<tbody>${posterRows}</tbody></table></div>
        <h3 style="margin:1.5rem 0 0.5rem;">T-Shirts <small style="color:var(--text-secondary); font-weight:400;">back A3 + chest print, no colour choice</small></h3>
        <div class="data-table-wrapper"><table>${head}<tbody>${apRows.join('')}</tbody></table></div>
        <h3 style="margin:1.5rem 0 0.5rem;">Per-order charges</h3>
        <div class="data-table-wrapper"><table>
          <thead><tr><th>Charge</th><th style="text-align:right;">Amount</th><th>When</th></tr></thead>
          <tbody>
            <tr><td>Shipping</td><td style="text-align:right;">${inr(C.shipping)} + ${Math.round(C.serviceGstRate * 100)}% GST</td><td>Every order</td></tr>
            <tr><td>COD fee</td><td style="text-align:right;">${inr(C.codFee)} + ${Math.round(C.serviceGstRate * 100)}% GST</td><td>Cash-on-delivery orders</td></tr>
            <tr><td>GST on items</td><td style="text-align:right;">Posters ${Math.round(T.poster.gstRate * 100)}% · T-shirts ${Math.round(T.apparel.gstRate * 100)}% · others ${Math.round(T.generic.gstRate * 100)}%</td><td>Every order</td></tr>
          </tbody>
        </table></div>`;
    } catch (e) {
      box.innerHTML = '<p style="color:var(--sale-red);">Couldn\'t load pricing — restart the backend so /api/pricing is available.</p>';
    }
  }


  // ---------- toast ----------
  let toastTimer;
  function showToast(message, isError = false) {
    const toast = $('toast');
    $('toast-text').textContent = message;
    toast.classList.toggle('toast-error', isError);
    toast.querySelector('i').className = isError ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), isError ? 6000 : 3500);
  }

  // ---------- auth ----------
  let adminToken = sessionStorage.getItem('brush_admin_token');
  const role = () => sessionStorage.getItem('brush_admin_role') || 'superadmin';
  const isSuper = () => role() === 'superadmin';
  const isWatcher = () => role() === 'watcher';

  async function api(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: { ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${adminToken}`, ...(opts.headers || {}) },
    });
    if (res.status === 401) {
      logout(true);
      throw new Error('Your session expired — please log in again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function checkAuth() {
    if (!adminToken) {
      $('login-overlay').hidden = false;
      setTimeout(() => $('admin-user').focus(), 50);
      return;
    }
    $('login-overlay').hidden = true;
    $('logged-in-user').textContent = sessionStorage.getItem('brush_admin_username') || 'admin';
    $('logged-in-role').textContent = role();
    $('nav-logs').hidden = !isSuper();
    $('nav-add-product').hidden = isWatcher();
    openView(currentViewFromHash());
    // Prime the badges even if the admin lands on another tab.
    if (!orders) loadOrders(true);
    if (!products) loadInventory(false, true);
  }

  function logout(expired) {
    if (adminToken && !expired) {
      fetch(`${API_BASE}/admin/logout`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
    }
    ['brush_admin_token', 'brush_admin_role', 'brush_admin_username'].forEach(k => sessionStorage.removeItem(k));
    adminToken = null;
    orders = null; products = null; edits.clear();
    updateDirtyUi();
    checkAuth();
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('login-btn');
    const err = $('login-error');
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: $('admin-user').value.trim(), password: $('admin-pass').value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(res.status === 429 ? 'Too many attempts — wait a few minutes and try again.' : (data.error || 'Invalid credentials'));
      adminToken = data.token;
      sessionStorage.setItem('brush_admin_token', adminToken);
      sessionStorage.setItem('brush_admin_role', data.role || 'superadmin');
      sessionStorage.setItem('brush_admin_username', data.username || 'admin');
      $('login-form').reset();
      checkAuth();
    } catch (ex) {
      err.textContent = ex.message === 'Failed to fetch' ? "Can't reach the server — is the backend running?" : ex.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });
  $('logout-btn').addEventListener('click', () => {
    if (edits.size && !confirm(`You have ${edits.size} unsaved product change(s). Log out anyway?`)) return;
    logout();
  });

  // ---------- navigation ----------
  const VIEWS = ['orders', 'inventory', 'add-product', 'pricing', 'logs'];
  function currentViewFromHash() {
    const h = location.hash.replace('#', '');
    if (h === 'logs' && !isSuper()) return 'orders';
    if (h === 'add-product' && isWatcher()) return 'orders';
    return VIEWS.includes(h) ? h : 'orders';
  }
  function openView(name) {
    document.querySelectorAll('.nav-item[data-target]').forEach(n => {
      const on = n.dataset.target === name;
      n.classList.toggle('active', on);
      if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
    document.querySelectorAll('.view-section').forEach(v => v.classList.toggle('active', v.id === `${name}-view`));
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    if (name === 'orders') loadOrders();
    if (name === 'inventory') loadInventory();
    if (name === 'logs') loadLogs();
    if (name === 'pricing') loadPricing();
    if (name === 'add-product') fillAddForm();
  }
  document.querySelectorAll('.nav-item[data-target]').forEach(item => item.addEventListener('click', () => openView(item.dataset.target)));
  window.addEventListener('hashchange', () => { if (adminToken) openView(currentViewFromHash()); });

  $('sidebar-toggle').addEventListener('click', () => {
    const sidebar = $('admin-sidebar');
    const collapsed = sidebar.classList.toggle('collapsed');
    $('sidebar-toggle-icon').className = `fa-solid fa-chevron-${collapsed ? 'right' : 'left'}`;
    $('sidebar-toggle').setAttribute('aria-expanded', String(!collapsed));
    $('sidebar-toggle').setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    try { localStorage.setItem('brush_admin_sidebar', collapsed ? '1' : ''); } catch (e) {}
  });
  try { if (localStorage.getItem('brush_admin_sidebar') === '1') $('sidebar-toggle').click(); } catch (e) {}

  // =====================================================================
  // ORDERS
  // =====================================================================
  let orders = null;
  let orderFilter = 'active';
  let ordersPage = 1;
  const ORDERS_PAGE = 50;

  async function loadOrders(silent) {
    if (!adminToken) return;
    const tbody = $('orders-table-body');
    if (!orders && !silent) tbody.innerHTML = '<tr><td colspan="7" class="empty"><span class="skeleton"></span></td></tr>';
    try {
      orders = await api('/orders');
      renderOrders();
    } catch (e) {
      if (!silent) tbody.innerHTML = `<tr><td colspan="7" class="empty error">Couldn't load orders — ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  function orderMatches(o, q) {
    if (!q) return true;
    const c = o.customer || {};
    return [o.orderId, c.name, c.email, c.id, c.phone, c.city, c.pincode].some(v => String(v || '').toLowerCase().includes(q));
  }

  function renderOrders() {
    if (!orders) return;
    const q = $('orders-search').value.trim().toLowerCase();
    const counts = { all: orders.length, active: 0 };
    STATUSES.forEach(s => { counts[s] = 0; });
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; if (o.status === 'confirmed' || o.status === 'packed') counts.active++; });

    // Stats
    const live = orders.filter(o => o.status !== 'cancelled');
    const today = new Date().toDateString();
    const todays = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthRevenue = live.filter(o => new Date(o.createdAt) >= monthStart).reduce((s, o) => s + Number(o.total || 0), 0);
    const aov = live.length ? live.reduce((s, o) => s + Number(o.total || 0), 0) / live.length : 0;
    $('order-stats').innerHTML = `
      <div class="stat${counts.active ? ' is-alert' : ''}"><div class="stat-label">To fulfil</div><div class="stat-value">${counts.active}</div><div class="stat-note">confirmed + packed</div></div>
      <div class="stat"><div class="stat-label">Today</div><div class="stat-value">${todays.length}</div><div class="stat-note">${inr(todays.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0))}</div></div>
      <div class="stat"><div class="stat-label">This month</div><div class="stat-value">${inr(Math.round(monthRevenue))}</div><div class="stat-note">excl. cancelled</div></div>
      <div class="stat"><div class="stat-label">Avg. order</div><div class="stat-value">${inr(Math.round(aov))}</div><div class="stat-note">${live.length} orders all-time</div></div>`;
    $('badge-orders').textContent = counts.active || '';

    // Chips
    const chips = [['active', 'To fulfil'], ['all', 'All'], ...STATUSES.map(s => [s, s[0].toUpperCase() + s.slice(1)])];
    $('orders-status-chips').innerHTML = chips.map(([k, label]) =>
      `<button type="button" class="chip${orderFilter === k ? ' active' : ''}" data-status="${k}" aria-pressed="${orderFilter === k}">${label} <span>${counts[k] || 0}</span></button>`).join('');

    const list = orders.filter(o =>
      (orderFilter === 'all' || (orderFilter === 'active' ? (o.status === 'confirmed' || o.status === 'packed') : o.status === orderFilter)) && orderMatches(o, q));

    const pages = Math.max(1, Math.ceil(list.length / ORDERS_PAGE));
    ordersPage = Math.min(ordersPage, pages);
    const slice = list.slice((ordersPage - 1) * ORDERS_PAGE, ordersPage * ORDERS_PAGE);
    const tbody = $('orders-table-body');
    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">${orders.length ? 'No orders match this filter.' : 'No orders yet.'}</td></tr>`;
    } else {
      tbody.innerHTML = slice.map(orderRow).join('');
    }
    renderPager($('orders-pager'), ordersPage, pages, list.length, 'orders');
  }

  function orderRow(o) {
    const id = escapeHtml(o.orderId);
    const c = o.customer || {};
    const status = STATUSES.includes(o.status) ? o.status : 'confirmed';
    const items = o.items || [];
    const itemCount = items.reduce((n, i) => n + Number(i.quantity || 0), 0);
    return `
      <tr data-order="${id}">
        <td><strong class="mono">${id}</strong><div class="muted small">${itemCount} item${itemCount === 1 ? '' : 's'}</div></td>
        <td class="nowrap" title="${escapeHtml(new Date(o.createdAt).toLocaleString('en-IN'))}">${relTime(o.createdAt)}</td>
        <td>${escapeHtml(c.name)}<div class="muted small">${escapeHtml(c.city)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</div></td>
        <td class="right nowrap"><strong>${inr(o.total)}</strong></td>
        <td><span class="small" style="text-transform:uppercase;font-weight:700;">${escapeHtml(o.paymentMethod)}</span></td>
        <td>
          <div class="status-cell">
            ${isSuper() ? `
            <select class="field field-sm status-dropdown" data-action="status" data-prev="${status}" aria-label="Status for ${id}">
              ${STATUSES.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>` : `<span class="status-badge status-${status}">${status}</span>`}
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn btn-sm btn-icon" data-action="details" aria-expanded="false" title="Show details" aria-label="Show details"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>
            <a href="${API_BASE}/orders/${encodeURIComponent(o.orderId)}/invoice" target="_blank" rel="noopener" class="btn btn-sm btn-icon" title="Invoice (PDF)" aria-label="Invoice"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i></a>
            ${!isWatcher() ? `<button type="button" class="btn btn-sm btn-icon" data-action="email" title="Email the customer their current status" aria-label="Send status email"><i class="fa-solid fa-envelope" aria-hidden="true"></i></button>` : ''}
            ${status !== 'cancelled' && isSuper() ? `<button type="button" class="btn btn-sm btn-icon btn-danger" data-action="cancel" title="Cancel order" aria-label="Cancel order"><i class="fa-solid fa-ban" aria-hidden="true"></i></button>` : ''}
          </div>
        </td>
      </tr>
      <tr class="details-row" data-details="${id}" hidden>
        <td colspan="7">
          <div class="details-grid">
            <div>
              <h4>Customer</h4>
              <p><strong>${escapeHtml(c.name)}</strong></p>
              <p>${escapeHtml(c.email || c.id || '—')}</p>
              <p>${escapeHtml(c.phone || '—')}</p>
              <p class="muted">${escapeHtml(c.address)}, ${escapeHtml(c.city)}, ${escapeHtml(c.state)} – ${escapeHtml(c.pincode)}</p>
            </div>
            <div>
              <h4>Items</h4>
              <table class="items-table">
                <thead><tr><th>Item</th><th>Options</th><th class="right">Qty</th><th class="right">Amount</th></tr></thead>
                <tbody>
                  ${items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td class="muted small">${formatVariantLine(i)}</td><td class="right">${Number(i.quantity)}</td><td class="right">${inr(Number(i.price) * Number(i.quantity))}</td></tr>`).join('')}
                </tbody>
              </table>
              <div class="totals">
                <p>Subtotal ${inr(o.subtotal)}</p>
                ${o.gst ? `<p>GST ${inr(o.gst)}</p>` : ''}
                <p>Shipping ${inr(o.shipping)}</p>
                ${o.codFee ? `<p>COD fee ${inr(o.codFee)}</p>` : ''}
                <p class="grand">Total ${inr(o.total)}</p>
              </div>
            </div>
          </div>
        </td>
      </tr>`;
  }

  async function setOrderStatus(orderId, status) {
    const data = await api(`/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const o = orders.find(x => x.orderId === orderId);
    if (o) o.status = status;
    if (data.emailSent) showToast(`Order ${orderId} → ${status}. Customer emailed.`);
    else showToast(`Order ${orderId} → ${status}, but the email failed (${data.emailError || 'unknown error'}).`, true);
    renderOrders();
  }

  $('orders-table-body').addEventListener('change', async (e) => {
    const sel = e.target.closest('[data-action="status"]');
    if (!sel) return;
    const orderId = sel.closest('tr').dataset.order;
    const prev = sel.dataset.prev;
    // A status change emails the customer — and "cancelled" can't be undone
    // from their side — so the dropdown asks first, like the Cancel button.
    const msg = sel.value === 'cancelled'
      ? `Cancel order ${orderId}? The customer will be emailed.`
      : `Mark order ${orderId} as ${sel.value}? The customer will be emailed.`;
    if (!confirm(msg)) { sel.value = prev; return; }
    sel.disabled = true;
    try { await setOrderStatus(orderId, sel.value); }
    catch (ex) { sel.value = prev; sel.disabled = false; showToast(ex.message, true); }
  });

  $('orders-table-body').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.tagName === 'SELECT') return;
    const orderId = btn.closest('tr').dataset.order;
    if (btn.dataset.action === 'details') {
      const row = $('orders-table-body').querySelector(`[data-details="${CSS.escape(orderId)}"]`);
      row.hidden = !row.hidden;
      btn.setAttribute('aria-expanded', String(!row.hidden));
      btn.querySelector('i').className = `fa-solid fa-chevron-${row.hidden ? 'down' : 'up'}`;
    } else if (btn.dataset.action === 'cancel') {
      if (!confirm(`Cancel order ${orderId}? This can't be undone and the customer will be emailed.`)) return;
      btn.disabled = true;
      try { await setOrderStatus(orderId, 'cancelled'); } catch (ex) { btn.disabled = false; showToast(ex.message, true); }
    } else if (btn.dataset.action === 'email') {
      btn.disabled = true;
      try {
        const data = await api(`/orders/${encodeURIComponent(orderId)}/send-update`, { method: 'POST' });
        showToast(`Status email sent to ${data.to || 'the customer'}.`);
      } catch (ex) { showToast(ex.message, true); }
      btn.disabled = false;
    }
  });

  $('orders-status-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-status]');
    if (!chip) return;
    orderFilter = chip.dataset.status;
    ordersPage = 1;
    renderOrders();
  });
  $('orders-search').addEventListener('input', debounce(() => { ordersPage = 1; renderOrders(); }, 150));
  $('orders-refresh').addEventListener('click', () => loadOrders());

  // =====================================================================
  // INVENTORY
  // =====================================================================
  let products = null;
  let invPage = 1;
  const INV_PAGE = 40;
  // Unsaved edits, keyed by product id: survive filtering, paging and
  // searching (the old table re-rendered from the server copy on every
  // keystroke and silently threw them away).
  const edits = new Map();

  async function loadInventory(force, silent) {
    if (!adminToken) return;
    if (products && !force) { renderInventory(); return; }
    if (force && edits.size && !confirm(`Refreshing will discard ${edits.size} unsaved change(s). Continue?`)) return;
    if (force) edits.clear();
    const tbody = $('inventory-table-body');
    if (!silent) tbody.innerHTML = '<tr><td colspan="8" class="empty"><span class="skeleton"></span></td></tr>';
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      products = await res.json();
      fillFilterOptions();
      updateDirtyUi();
      renderInventory();
    } catch (e) {
      if (!silent) tbody.innerHTML = `<tr><td colspan="8" class="empty error">Couldn't load products — ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  function allCategories() {
    const set = new Set(BASE_CATEGORIES);
    (products || []).forEach(p => { if (p.category) set.add(p.category); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function fillFilterOptions() {
    const tf = $('inventory-type-filter');
    const tv = tf.value;
    const counts = {};
    products.forEach(p => { const k = typeKey(p.productType); counts[k] = (counts[k] || 0) + 1; });
    tf.innerHTML = '<option value="all">All types</option>' + TYPES.filter(t => counts[t.key]).map(t => `<option value="${t.key}">${t.label}s (${counts[t.key]})</option>`).join('');
    tf.value = [...tf.options].some(o => o.value === tv) ? tv : 'all';
    const cf = $('inventory-cat-filter');
    const cv = cf.value;
    const cc = {};
    products.forEach(p => { if (p.category) cc[p.category] = (cc[p.category] || 0) + 1; });
    cf.innerHTML = '<option value="All">All categories</option>' + Object.keys(cc).sort().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)} (${cc[c]})</option>`).join('');
    cf.value = [...cf.options].some(o => o.value === cv) ? cv : 'All';
  }

  // Current values for a product: server copy with any unsaved edits on top.
  const view = (p) => ({ ...p, ...(edits.get(String(p.id)) || {}) });

  function filteredProducts() {
    const q = $('inventory-search').value.trim().toLowerCase();
    const type = $('inventory-type-filter').value;
    const cat = $('inventory-cat-filter').value;
    const stock = $('inventory-stock-filter').value;
    const sort = $('inventory-sort').value;
    let list = products.map(view).filter(p => {
      if (type !== 'all' && typeKey(p.productType) !== type) return false;
      if (cat !== 'All' && (p.category || '') !== cat) return false;
      const s = stockOf(p);
      if (stock === 'out' && s > 0) return false;
      if (stock === 'low' && !(s > 0 && s <= LOW_STOCK)) return false;
      if (stock === 'in' && s <= 0) return false;
      if (q && !`${p.name || ''} ${p.sku || ''} ${p.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const by = {
      'stock-asc': (a, b) => stockOf(a) - stockOf(b),
      'stock-desc': (a, b) => stockOf(b) - stockOf(a),
      'freq-desc': (a, b) => (b.orderFrequency || 0) - (a.orderFrequency || 0),
      name: (a, b) => String(a.name).localeCompare(String(b.name)),
      newest: (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0),
    }[sort];
    if (by) list = list.slice().sort(by);
    return list;
  }

  function renderInventory() {
    if (!products) return;
    // Stats
    const out = products.filter(p => stockOf(view(p)) <= 0).length;
    const low = products.filter(p => { const s = stockOf(view(p)); return s > 0 && s <= LOW_STOCK; }).length;
    const onHome = products.filter(p => p.showInBestsellers || p.showInNewArrivals || p.showInGrossing).length;
    $('inventory-stats').innerHTML = `
      <div class="stat"><div class="stat-label">Products</div><div class="stat-value">${products.length}</div><div class="stat-note">${onHome} featured on the homepage</div></div>
      <div class="stat${out ? ' is-alert' : ''}"><div class="stat-label">Out of stock</div><div class="stat-value">${out}</div><div class="stat-note"><button type="button" class="btn btn-sm" data-quick="out">Show</button></div></div>
      <div class="stat"><div class="stat-label">Low stock</div><div class="stat-value">${low}</div><div class="stat-note"><button type="button" class="btn btn-sm" data-quick="low">Show</button> ≤ ${LOW_STOCK} left</div></div>`;
    $('badge-inventory').textContent = out || '';

    const list = filteredProducts();
    const pages = Math.max(1, Math.ceil(list.length / INV_PAGE));
    invPage = Math.min(invPage, pages);
    const slice = list.slice((invPage - 1) * INV_PAGE, invPage * INV_PAGE);
    $('inventory-table-body').innerHTML = slice.length ? slice.map(productRow).join('') : '<tr><td colspan="8" class="empty">No products match these filters.</td></tr>';
    renderPager($('inventory-pager'), invPage, pages, list.length, 'products');
  }

  function productRow(p) {
    const id = escapeHtml(p.id);
    const canEdit = isSuper();
    const canStock = !isWatcher();
    const dis = canEdit ? '' : 'disabled';
    const s = stockOf(p);
    const tk = typeKey(p.productType);
    const cats = allCategories();
    if (p.category && !cats.includes(p.category)) cats.push(p.category);
    const locked = typeof Cart !== 'undefined' && typeof Cart.typeConfigFor(p.productType).basePrice === 'number';
    const thumb = window.BrushImg ? BrushImg.src(p, 480) : p.image;
    return `
      <tr data-id="${id}" class="${edits.has(String(p.id)) ? 'is-dirty' : ''}">
        <td>
          <div class="prod-cell">
            <img src="${escapeHtml(thumb)}" data-orig="${escapeHtml(p.image)}" data-fallback="img/placeholders/fallback.webp" onerror="BrushImg.onError(this)" alt="" class="prod-thumb" width="48" height="60" loading="lazy" decoding="async">
            <div class="prod-fields">
              <input type="text" class="field field-sm" data-field="name" value="${escapeHtml(p.name)}" ${dis} aria-label="Name">
              <select class="field field-sm" data-field="productType" ${dis} aria-label="Product type">
                ${TYPES.map(t => `<option value="${t.value}" ${t.key === tk ? 'selected' : ''}>${t.label}</option>`).join('')}
                ${!typeMeta(p.productType) ? `<option value="${escapeHtml(p.productType)}" selected>${escapeHtml(p.productType)}</option>` : ''}
              </select>
              <select class="field field-sm" data-field="category" ${dis} aria-label="Category">
                ${cats.map(c => `<option value="${escapeHtml(c)}" ${p.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>
          </div>
        </td>
        <td><input type="text" class="field field-sm mono w-md" data-field="sku" value="${escapeHtml(p.sku || p.id)}" ${dis} aria-label="SKU"><div class="muted small">ID ${id}</div></td>
        <td>
          <div class="inv-stack">
            <input type="text" class="field field-sm w-md" data-field="badge" value="${escapeHtml(p.badge || '')}" placeholder="Badge" ${dis} aria-label="Badge">
            <input type="text" class="field field-sm w-md" data-field="keywords" value="${escapeHtml(keywordsText(p.keywords))}" placeholder="Keywords" ${dis} aria-label="Keywords">
          </div>
        </td>
        <td class="nowrap">
          ${locked
            ? `<span class="locked-price">${inr(p.price)}</span><span class="locked-note" title="Priced from the Qikink rate table — see Pricing"><i class="fa-solid fa-lock" aria-hidden="true"></i> rate table</span>`
            : `<input type="number" min="0" step="1" class="field field-sm w-sm" data-field="price" value="${escapeHtml(p.price)}" ${dis} aria-label="Price">`}
        </td>
        <td class="${s <= 0 ? 'stock-out' : s <= LOW_STOCK ? 'stock-low' : ''}">
          <input type="number" min="0" step="1" class="field field-sm w-sm" data-field="stockQuantity" value="${s}" ${canStock ? '' : 'disabled'} aria-label="Stock">
        </td>
        <td class="right"><strong>${Number(p.orderFrequency || 0)}</strong></td>
        <td>
          <label class="check"><input type="checkbox" data-field="showInBestsellers" ${p.showInBestsellers ? 'checked' : ''} ${dis}> Bestsellers</label>
          <label class="check"><input type="checkbox" data-field="showInNewArrivals" ${p.showInNewArrivals ? 'checked' : ''} ${dis}> New arrivals</label>
          <label class="check"><input type="checkbox" data-field="showInGrossing" ${p.showInGrossing ? 'checked' : ''} ${dis}> Grossing</label>
        </td>
        <td>
          <div class="inv-stack">
            <button type="button" class="btn btn-sm" data-action="save" ${canStock && edits.has(String(p.id)) ? '' : 'disabled'}>Save</button>
            ${isSuper() ? '<button type="button" class="btn btn-sm btn-danger" data-action="delete">Delete</button>' : ''}
          </div>
        </td>
      </tr>`;
  }

  // Read a row's inputs into the fields this role may change.
  function readRow(tr) {
    const out = {};
    tr.querySelectorAll('[data-field]').forEach(el => {
      const f = el.dataset.field;
      if (el.disabled) return;
      if (el.type === 'checkbox') out[f] = el.checked;
      else if (el.type === 'number') out[f] = el.value === '' ? '' : Number(el.value);
      else out[f] = el.value.trim();
    });
    return out;
  }

  // Only the fields that actually differ from the server copy.
  function diff(p, row) {
    const d = {};
    Object.entries(row).forEach(([k, v]) => {
      const orig = k === 'keywords' ? keywordsText(p.keywords) : k === 'sku' ? String(p.sku || p.id) : k === 'stockQuantity' ? stockOf(p) : p[k];
      if (k === 'productType' ? typeKey(v) !== typeKey(orig) : String(v ?? '') !== String(orig ?? (typeof v === 'boolean' ? false : ''))) d[k] = v;
    });
    return d;
  }

  $('inventory-table-body').addEventListener('input', onRowEdit);
  $('inventory-table-body').addEventListener('change', onRowEdit);
  function onRowEdit(e) {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || !e.target.dataset.field) return;
    const p = products.find(x => String(x.id) === tr.dataset.id);
    const d = diff(p, readRow(tr));
    if (Object.keys(d).length) edits.set(tr.dataset.id, d); else edits.delete(tr.dataset.id);
    tr.classList.toggle('is-dirty', edits.has(tr.dataset.id));
    tr.querySelector('[data-action="save"]').disabled = !edits.has(tr.dataset.id);
    if (e.target.dataset.field === 'stockQuantity') {
      const s = Number(e.target.value);
      e.target.parentElement.className = s <= 0 ? 'stock-out' : s <= LOW_STOCK ? 'stock-low' : '';
    }
    updateDirtyUi();
  }

  function updateDirtyUi() {
    const n = edits.size;
    const btn = $('save-all-btn');
    btn.disabled = !n || isWatcher();
    btn.querySelector('span').textContent = n ? `Save ${n} change${n === 1 ? '' : 's'}` : 'No unsaved changes';
    $('discard-btn').hidden = !n;
  }

  // Validate before sending; the server stores whatever it's given.
  function validate(p, d) {
    if ('name' in d && !d.name) return "Name can't be empty";
    if ('stockQuantity' in d && (!Number.isInteger(d.stockQuantity) || d.stockQuantity < 0)) return 'Stock must be a whole number ≥ 0';
    if ('price' in d && (!Number.isFinite(d.price) || d.price <= 0)) return 'Price must be more than 0';
    return null;
  }

  async function saveProduct(id) {
    const p = products.find(x => String(x.id) === String(id));
    const d = edits.get(String(id));
    if (!p || !d) return true;
    const problem = validate(p, d);
    if (problem) { showToast(`${p.name}: ${problem}`, true); return false; }
    const payload = { ...d };
    await api(`/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
    Object.assign(p, d);
    // The server re-derives the price for rate-table types; mirror it.
    if (typeof Cart !== 'undefined') { const base = Cart.typeConfigFor(p.productType).basePrice; if (typeof base === 'number') p.price = base; }
    edits.delete(String(id));
    return true;
  }

  $('inventory-table-body').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr[data-id]');
    const id = tr.dataset.id;
    const p = products.find(x => String(x.id) === id);
    if (btn.dataset.action === 'save') {
      tr.classList.add('is-saving');
      try {
        if (await saveProduct(id)) { showToast(`Saved “${p.name}”.`); renderInventory(); updateDirtyUi(); }
      } catch (ex) { showToast(ex.message, true); }
      tr.classList.remove('is-saving');
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(`Delete “${p.name}” (ID ${id})? This can't be undone.`)) return;
      try {
        await api(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
        products = products.filter(x => String(x.id) !== id);
        edits.delete(id);
        showToast(`Deleted “${p.name}”.`);
        fillFilterOptions(); renderInventory(); updateDirtyUi();
      } catch (ex) { showToast(ex.message, true); }
    }
  });

  // Save only what changed, a few requests at a time (the old Save All
  // PATCHed every visible row one by one, changed or not).
  $('save-all-btn').addEventListener('click', async () => {
    const ids = [...edits.keys()];
    if (!ids.length) return;
    const btn = $('save-all-btn');
    btn.disabled = true;
    btn.querySelector('span').textContent = `Saving ${ids.length}…`;
    let ok = 0, failed = 0, firstError = '';
    const queue = ids.slice();
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift();
        try { if (await saveProduct(id)) ok++; else failed++; }
        catch (ex) { failed++; firstError = firstError || ex.message; }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    renderInventory();
    updateDirtyUi();
    if (failed) showToast(`Saved ${ok}, ${failed} failed${firstError ? ` — ${firstError}` : ''}. Failed rows are still highlighted.`, true);
    else showToast(`Saved ${ok} product${ok === 1 ? '' : 's'}.`);
  });

  $('discard-btn').addEventListener('click', () => {
    if (!confirm(`Discard ${edits.size} unsaved change(s)?`)) return;
    edits.clear();
    renderInventory();
    updateDirtyUi();
  });

  $('inventory-stats').addEventListener('click', (e) => {
    const q = e.target.closest('[data-quick]');
    if (!q) return;
    $('inventory-stock-filter').value = q.dataset.quick;
    invPage = 1;
    renderInventory();
  });

  const rerenderInv = () => { invPage = 1; renderInventory(); };
  $('inventory-search').addEventListener('input', debounce(rerenderInv, 150));
  ['inventory-type-filter', 'inventory-cat-filter', 'inventory-stock-filter', 'inventory-sort'].forEach(id => $(id).addEventListener('change', rerenderInv));
  $('inventory-refresh').addEventListener('click', () => loadInventory(true));

  window.addEventListener('beforeunload', (e) => {
    if (edits.size) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- shared pager ----------
  function renderPager(el, page, pages, total, noun) {
    const label = `${total} ${total === 1 ? noun.replace(/s$/, '') : noun}`;
    if (pages <= 1) { el.innerHTML = total ? `<span>${label}</span>` : ''; return; }
    el.innerHTML = `<span>Page ${page} of ${pages} · ${label}</span>
      <div class="pager-buttons">
        <button type="button" class="btn btn-sm" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Prev</button>
        <button type="button" class="btn btn-sm" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>Next <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
      </div>`;
  }
  $('orders-pager').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) { ordersPage = Number(b.dataset.page); renderOrders(); $('orders-view').scrollIntoView(); } });
  $('inventory-pager').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) { invPage = Number(b.dataset.page); renderInventory(); $('inventory-view').scrollIntoView(); } });

  // =====================================================================
  // ADD PRODUCT
  // =====================================================================
  function fillAddForm() {
    const typeSel = $('new-prod-type');
    if (!typeSel.options.length) {
      typeSel.innerHTML = TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
      syncNewProductPriceField();
    }
    $('category-options').innerHTML = allCategories().map(c => `<option value="${escapeHtml(c)}">`).join('');
  }

  function syncNewProductPriceField() {
    const type = $('new-prod-type').value;
    const priceEl = $('new-prod-price');
    const note = $('new-prod-price-note');
    const cfg = typeof Cart !== 'undefined' ? Cart.typeConfigFor(type) : null;
    if (cfg && typeof cfg.basePrice === 'number') {
      priceEl.value = cfg.basePrice;
      priceEl.disabled = true;
      note.textContent = `${cfg.label}s are priced from the Qikink rate table (from ₹${cfg.basePrice}; sizes and variants are priced automatically) — see Pricing.`;
    } else {
      if (priceEl.disabled) priceEl.value = '';
      priceEl.disabled = false;
      note.textContent = '';
    }
  }
  $('new-prod-type').addEventListener('change', syncNewProductPriceField);
  $('new-prod-cat').addEventListener('change', (e) => {
    if (e.target.value.trim().toLowerCase() === 'apparel') { $('new-prod-type').value = 'apparel'; syncNewProductPriceField(); }
  });

  // pdf.js is ~300 KB — only fetched when someone actually picks a PDF.
  let pdfjsReady = null;
  function loadPdfJs() {
    if (!pdfjsReady) {
      pdfjsReady = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'; resolve(window.pdfjsLib); };
        s.onerror = () => { pdfjsReady = null; reject(new Error("Couldn't load the PDF reader")); };
        document.head.appendChild(s);
      });
    }
    return pdfjsReady;
  }

  async function pdfToJpeg(file) {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
    return new File([blob], file.name.replace(/\.pdf$/i, '.jpg'), { type: 'image/jpeg' });
  }

  $('new-prod-image').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const img = $('new-prod-preview');
    if (!file) { img.hidden = true; return; }
    if (file.size > 20 * 1024 * 1024) { showToast('That file is over 20 MB — please pick a smaller one.', true); e.target.value = ''; img.hidden = true; return; }
    try {
      const shown = file.type === 'application/pdf' ? await pdfToJpeg(file) : file;
      img.src = URL.createObjectURL(shown);
      img.hidden = false;
    } catch (ex) { img.hidden = true; }
  });

  $('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!adminToken) return;
    const btn = $('add-prod-btn');
    const label = btn.innerHTML;
    btn.disabled = true;
    try {
      let file = $('new-prod-image').files[0];
      if (file && file.type === 'application/pdf') {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Converting PDF…';
        file = await pdfToJpeg(file);
      }
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Uploading…';
      const price = $('new-prod-price').value;
      const fd = new FormData();
      fd.append('name', $('new-prod-name').value.trim());
      fd.append('category', $('new-prod-cat').value.trim());
      fd.append('productType', $('new-prod-type').value);
      fd.append('price', price);
      fd.append('originalPrice', $('new-prod-original-price').value || price);
      fd.append('badge', $('new-prod-badge').value.trim());
      fd.append('stockQuantity', $('new-prod-stock').value);
      fd.append('description', $('new-prod-desc').value.trim());
      fd.append('keywords', $('new-prod-keywords').value.trim());
      fd.append('sku', $('new-prod-sku').value.trim());
      fd.append('image', file);
      const data = await api('/products', { method: 'POST', body: fd });
      showToast(`Added “${data.product ? data.product.name : 'product'}”.`);
      $('add-product-form').reset();
      $('new-prod-preview').hidden = true;
      syncNewProductPriceField();
      if (products && data.product) { products.push(data.product); fillFilterOptions(); }
    } catch (ex) {
      showToast(ex.message, true);
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });

  // =====================================================================
  // ACTIVITY LOG
  // =====================================================================
  let logs = null;
  async function loadLogs() {
    if (!adminToken || !isSuper()) return;
    const tbody = $('logs-table-body');
    try {
      logs = await api('/admin/logs');
      renderLogs();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty error">Couldn't load the log — ${escapeHtml(e.message)}</td></tr>`;
    }
  }
  function renderLogs() {
    if (!logs) return;
    const q = $('logs-search').value.trim().toLowerCase();
    const list = logs.filter(l => !q || `${l.username} ${l.action} ${l.details}`.toLowerCase().includes(q));
    $('logs-table-body').innerHTML = list.length ? list.map(l => `
      <tr data-log="${escapeHtml(l.id)}">
        <td class="nowrap" title="${escapeHtml(new Date(l.timestamp).toLocaleString('en-IN'))}">${relTime(l.timestamp)}</td>
        <td><strong>${escapeHtml(l.username)}</strong></td>
        <td><span class="status-badge status-packed">${escapeHtml(l.action)}</span></td>
        <td class="muted">${escapeHtml(l.details)}</td>
        <td><button type="button" class="btn btn-sm btn-icon" data-keep="${l.keep ? '0' : '1'}" aria-pressed="${!!l.keep}" title="${l.keep ? 'Kept — click to let it expire' : 'Keep beyond 72 hours'}" aria-label="Keep entry"><i class="fa-${l.keep ? 'solid' : 'regular'} fa-star" aria-hidden="true" style="${l.keep ? 'color:var(--accent)' : ''}"></i></button></td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty">No log entries.</td></tr>';
  }
  $('logs-table-body').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-keep]');
    if (!b) return;
    const id = b.closest('tr').dataset.log;
    try {
      await api(`/admin/logs/${encodeURIComponent(id)}/keep`, { method: 'PATCH', body: JSON.stringify({ keep: b.dataset.keep === '1' }) });
      const l = logs.find(x => x.id === id);
      if (l) l.keep = b.dataset.keep === '1';
      renderLogs();
    } catch (ex) { showToast(ex.message, true); }
  });
  $('logs-search').addEventListener('input', debounce(renderLogs, 150));
  $('logs-refresh').addEventListener('click', loadLogs);
  $('pricing-refresh').addEventListener('click', loadPricing);

  checkAuth();
})();
