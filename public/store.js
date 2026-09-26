// ========================================
// BRUSH — Store (all_products.html)
//
// Marketplace-style catalogue: product-type tabs across the top, faceted
// filters (genre, price, rating, discount, availability) in a sidebar that
// becomes a bottom sheet on phones, a sort bar, removable filter chips and
// a product grid. All state lives in the URL (?type=&category=&sort=&q=
// &page=) so any view can be shared, bookmarked or reached from the
// navbar's deep links.
//
// Cards keep the .product-card / .quick-add-btn / data-* contract that
// script.js reads, so the product modal and quick-add work unchanged.
// ========================================
(function () {
  const PAGE_SIZE = 24;

  // Tabs. `match` maps whatever productType string a product carries
  // ('poster', 'Posters', undefined, 'wallpaper', ...) onto a tab.
  const TYPES = [
    { key: 'all', label: 'All', icon: 'fa-border-all' },
    { key: 'posters', label: 'Posters', icon: 'fa-image' },
    { key: 'apparel', label: 'T-Shirts', icon: 'fa-shirt' },
    { key: 'stickers', label: 'Stickers', icon: 'fa-note-sticky' },
    { key: 'wallpapers', label: 'Wallpapers', icon: 'fa-panorama' },
    { key: 'collectibles', label: 'Collectibles', icon: 'fa-gem' },
  ];

  const SORTS = [
    { key: 'relevance', label: 'Relevance' },
    { key: 'popular', label: 'Popularity' },
    { key: 'price-asc', label: 'Price — Low to High' },
    { key: 'price-desc', label: 'Price — High to Low' },
    { key: 'newest', label: 'Newest First' },
  ];

  const PRICE_BUCKETS = [
    { key: 'u100', label: 'Under ₹100', min: 0, max: 99 },
    { key: '100-500', label: '₹100 – ₹500', min: 100, max: 500 },
    { key: '500-1500', label: '₹500 – ₹1,500', min: 501, max: 1500 },
    { key: 'o1500', label: 'Over ₹1,500', min: 1501, max: Infinity },
  ];

  const RATINGS = [{ key: '4', label: '4★ & above', min: 4 }, { key: '3', label: '3★ & above', min: 3 }];
  const DISCOUNTS = [{ key: '50', label: '50% or more', min: 50 }, { key: '30', label: '30% or more', min: 30 }];

  const FAQ_COMMON_RETURNS = (thing) => ({ icon: 'fa-box-open', q: `What if my ${thing} arrives damaged or wrong?`, a: `Every piece is made to order, so we don't offer change-of-mind returns — but if your order arrives damaged or incorrect, we'll replace it once you share an unboxing video. See our <a href="policies.html#cancellation-returns">full returns policy</a>.` });

  const COPY = {
    all: {
      title: 'All Products',
      intro: 'Posters, tees, stickers, wallpapers and collectibles — all printed or packed to order in our Patna studio. Pick a category above, then narrow it down with filters.',
      faq: [
        { icon: 'fa-ruler-combined', q: 'What do A4, A5 and A3 actually measure?', a: 'A5 is 14.8 × 21 cm, A4 is 21 × 29.7 cm, and A3 is 29.7 × 42 cm. A4 is the base size on every poster; other sizes are offered as swatches on the product itself, with the price shown on each.' },
        { icon: 'fa-clock', iconStyle: 'fa-regular', q: 'How long does an order take to arrive?', a: 'Orders are printed, packed and dispatched within 1–2 business days. After dispatch, metros and Tier 1 cities typically take 3–5 business days, while Tier 2/3 and remote areas take 5–10 business days.' },
        FAQ_COMMON_RETURNS('order'),
      ],
    },
    posters: {
      title: 'Posters',
      intro: 'Every poster is printed to order on matte art-board and shipped from our Patna studio. Choose a size on the product — A5 to 18×24″.',
      faq: [
        { icon: 'fa-ruler-combined', q: 'What do A4, A5 and A3 actually measure?', a: 'A5 is 14.8 × 21 cm, A4 is 21 × 29.7 cm, and A3 is 29.7 × 42 cm. A4 is the base size on every listing; other sizes are offered as swatches on the product itself, with the price shown on each.' },
        { icon: 'fa-clock', iconStyle: 'fa-regular', q: 'How long does an order take to arrive?', a: 'Every poster is print-on-demand, so orders are printed, packed and dispatched within 1–2 business days. After dispatch, metros and Tier 1 cities typically take 3–5 business days, while Tier 2/3 and remote areas take 5–10 business days.' },
        FAQ_COMMON_RETURNS('poster'),
      ],
    },
    apparel: {
      title: 'T-Shirts',
      intro: 'Oversized parody tees — a front chest logo and a full back print on every shirt. Open any tee to see the back, the front, the design layout and the size chart.',
      faq: [
        { icon: 'fa-ruler-combined', q: 'How do the tees fit?', a: "They are cut oversized. Check the size chart in each product's image gallery (last slide) for chest and length in inches." },
        { icon: 'fa-shirt', q: 'Where is the print placed?', a: 'Every design has a small logo on the left chest and the full artwork across the back. The "Design" slide in the gallery shows both prints laid out.' },
        FAQ_COMMON_RETURNS('tee'),
      ],
    },
    stickers: {
      title: 'Stickers',
      intro: 'A4 kiss-cut sticker sheets in matte, waterproof vinyl — peel them straight onto laptops, bottles and journals.',
      faq: [
        { icon: 'fa-note-sticky', q: 'What exactly is on a sheet?', a: 'Each listing is one A4 kiss-cut sheet; the product description tells you how many stickers it holds. Every sticker is matte, waterproof vinyl.' },
        FAQ_COMMON_RETURNS('sticker sheet'),
      ],
    },
    wallpapers: {
      title: 'Wallpapers',
      intro: 'Peel-and-stick wallpaper rolls printed to order — the same art direction as our posters, sized to cover a wall.',
      faq: [
        { icon: 'fa-ruler-combined', q: 'What roll sizes are available?', a: 'Every design comes as a 1 m × 3 m roll or a 1.5 m × 3 m roll, selectable on the product page with the price shown on each swatch.' },
        FAQ_COMMON_RETURNS('wallpaper'),
      ],
    },
    collectibles: {
      title: 'Collectibles',
      intro: 'Limited-run scale figures, hand-picked and inspected before they ship.',
      faq: [FAQ_COMMON_RETURNS('collectible')],
    },
  };

  // ---- helpers ----
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  function typeKey(p) {
    const t = String(p.productType || '').toLowerCase();
    if (!t || t.startsWith('poster')) return 'posters';
    if (t === 'apparel' || t.includes('shirt')) return 'apparel';
    if (t.startsWith('sticker')) return 'stickers';
    if (t.startsWith('wallpaper')) return 'wallpapers';
    if (t.startsWith('collectible')) return 'collectibles';
    return 'other';
  }
  function ratingOf(p) {
    const v = (p.reviews || []).map(r => Number(r.rating)).filter(x => x >= 1 && x <= 5);
    return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, count: v.length } : { avg: 0, count: 0 };
  }
  const discountOf = (p) => (p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0);
  const stockOf = (p) => (p.stockQuantity !== undefined ? p.stockQuantity : 50);
  const keywordText = (p) => (Array.isArray(p.keywords) ? p.keywords.join(' ') : String(p.keywords || '')).toLowerCase();
  const typeParamToKey = (v) => {
    if (!v) return 'all';
    const t = String(v).toLowerCase();
    if (t === 'all') return 'all';
    return typeKey({ productType: t === 'plates' ? 'other' : t });
  };

  // ---- state ----
  let products = [];
  let byType = {};
  const state = {
    type: 'all',
    genres: new Set(),
    genreQuery: '',   // loose ?category= from a deep link that matched no facet exactly
    prices: new Set(),
    rating: '',
    discount: '',
    inStock: false,
    sort: 'relevance',
    q: '',
    page: 1,
  };

  const $ = (id) => document.getElementById(id);
  const els = {};

  // ---- URL state ----
  function readUrl() {
    const u = new URLSearchParams(window.location.search);
    state.type = typeParamToKey(u.get('type'));
    state.q = u.get('search') || u.get('q') || '';
    state.sort = SORTS.some(s => s.key === u.get('sort')) ? u.get('sort') : 'relevance';
    state.page = Math.max(1, parseInt(u.get('page'), 10) || 1);
    state.genres = new Set();
    state.genreQuery = '';
    const cat = u.get('category');
    if (cat) {
      cat.split(',').forEach(c => {
        const exact = genreFacets(state.type).find(g => g.name.toLowerCase() === c.toLowerCase());
        const loose = exact || genreFacets(state.type).find(g => g.name.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(g.name.toLowerCase()));
        if (loose) state.genres.add(loose.name);
        else state.genreQuery = c;
      });
    }
    state.prices = new Set((u.get('price') || '').split(',').filter(k => PRICE_BUCKETS.some(b => b.key === k)));
    state.rating = RATINGS.some(r => r.key === u.get('rating')) ? u.get('rating') : '';
    state.discount = DISCOUNTS.some(d => d.key === u.get('discount')) ? u.get('discount') : '';
    state.inStock = u.get('instock') === '1';
  }

  function writeUrl() {
    const u = new URLSearchParams();
    if (state.type !== 'all') u.set('type', TYPES.find(t => t.key === state.type).label === 'T-Shirts' ? 'Apparel' : TYPES.find(t => t.key === state.type).label);
    const cats = [...state.genres];
    if (state.genreQuery) cats.push(state.genreQuery);
    if (cats.length) u.set('category', cats.join(','));
    if (state.prices.size) u.set('price', [...state.prices].join(','));
    if (state.rating) u.set('rating', state.rating);
    if (state.discount) u.set('discount', state.discount);
    if (state.inStock) u.set('instock', '1');
    if (state.sort !== 'relevance') u.set('sort', state.sort);
    if (state.q) u.set('search', state.q);
    if (state.page > 1) u.set('page', state.page);
    const qs = u.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  // ---- filtering ----
  function genreFacets(type) {
    const counts = {};
    (type === 'all' ? products : (byType[type] || [])).forEach(p => {
      const c = (p.category || '').trim();
      if (c && c.toLowerCase() !== 'apparel') counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  function matches(p, skip) {
    if (state.type !== 'all' && typeKey(p) !== state.type) return false;
    if (state.q) {
      const k = state.q.toLowerCase();
      const hay = `${p.name || ''} ${p.category || ''} ${p.description || ''} ${keywordText(p)}`.toLowerCase();
      if (!k.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    if (skip !== 'genre') {
      if (state.genres.size && !state.genres.has((p.category || '').trim())) return false;
      if (state.genreQuery) {
        const g = state.genreQuery.toLowerCase();
        const hay = `${p.name || ''} ${p.category || ''} ${p.description || ''} ${keywordText(p)}`.toLowerCase();
        if (!(hay.includes(g) || (g === 'new' && p.showInNewArrivals))) return false;
      }
    }
    if (skip !== 'price' && state.prices.size) {
      if (![...state.prices].some(k => { const b = PRICE_BUCKETS.find(x => x.key === k); return p.price >= b.min && p.price <= b.max; })) return false;
    }
    if (state.rating && ratingOf(p).avg < Number(state.rating)) return false;
    if (state.discount && discountOf(p) < Number(state.discount)) return false;
    if (state.inStock && stockOf(p) <= 0) return false;
    return true;
  }

  function sorted(list) {
    const withIdx = list.map((p, i) => ({ p, i }));
    const dummy = (p) => (window.BrushImg && BrushImg.isDummy(p) ? 1 : 0);
    const out = (p) => (stockOf(p) <= 0 ? 1 : 0);
    const cmp = {
      relevance: (a, b) => dummy(a.p) - dummy(b.p) || out(a.p) - out(b.p) || a.i - b.i,
      popular: (a, b) => {
        const ra = ratingOf(a.p), rb = ratingOf(b.p);
        const sa = ra.count * ra.avg + (/best/i.test(a.p.badge || '') ? 20 : 0) + (a.p.showInBestsellers ? 20 : 0);
        const sb = rb.count * rb.avg + (/best/i.test(b.p.badge || '') ? 20 : 0) + (b.p.showInBestsellers ? 20 : 0);
        return out(a.p) - out(b.p) || sb - sa || a.i - b.i;
      },
      'price-asc': (a, b) => a.p.price - b.p.price || a.i - b.i,
      'price-desc': (a, b) => b.p.price - a.p.price || a.i - b.i,
      newest: (a, b) => (b.p.showInNewArrivals ? 1 : 0) - (a.p.showInNewArrivals ? 1 : 0) || (Number(b.p.id) || 0) - (Number(a.p.id) || 0),
    }[state.sort];
    return withIdx.sort(cmp).map(x => x.p);
  }

  // ---- rendering ----
  function renderTabs() {
    els.tabs.innerHTML = TYPES.map(t => {
      const n = t.key === 'all' ? products.length : (byType[t.key] || []).length;
      if (t.key !== 'all' && !n && products.length) return '';
      return `<button type="button" class="store-tab${state.type === t.key ? ' active' : ''}" data-type="${t.key}" role="tab" aria-selected="${state.type === t.key}">
        <span class="store-tab-icon"><i class="fa-solid ${t.icon}" aria-hidden="true"></i></span>
        <span class="store-tab-label">${t.label}</span>
      </button>`;
    }).join('');
  }

  function checkbox(name, value, label, count, checked) {
    return `<label class="facet-option"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${esc(label)}</span>${count !== undefined ? `<span class="facet-count">${count}</span>` : ''}</label>`;
  }
  function radio(name, value, label, checked) {
    return `<label class="facet-option"><input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  }

  function renderFacets() {
    const scope = products.filter(p => state.type === 'all' || typeKey(p) === state.type);
    const genres = genreFacets(state.type);
    const genreCount = (name) => products.filter(p => (p.category || '').trim() === name && matches(p, 'genre')).length;
    const priceCount = (b) => products.filter(p => p.price >= b.min && p.price <= b.max && matches(p, 'price')).length;
    const prices = PRICE_BUCKETS.filter(b => scope.some(p => p.price >= b.min && p.price <= b.max));

    const genreItems = genres.map(g => checkbox('genre', g.name, g.name, genreCount(g.name), state.genres.has(g.name)));
    const MAX = 8;
    els.facets.innerHTML = `
      <div class="facet-head">
        <h2>Filters</h2>
        <button type="button" class="facet-clear" data-action="clear"${activeCount() ? '' : ' hidden'}>Clear all</button>
      </div>
      <div class="facet-group">
        <label class="facet-search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" id="store-search" placeholder="Search in ${esc(COPY[state.type].title.toLowerCase())}…" value="${esc(state.q)}" aria-label="Search products" autocomplete="off">
        </label>
      </div>
      ${genres.length ? `<fieldset class="facet-group">
        <legend>Genre</legend>
        <div class="facet-list${genres.length > MAX ? ' is-collapsible' : ''}">${genreItems.join('')}</div>
        ${genres.length > MAX ? `<button type="button" class="facet-more" data-action="more">+ ${genres.length - MAX} more</button>` : ''}
      </fieldset>` : ''}
      ${prices.length > 1 ? `<fieldset class="facet-group">
        <legend>Price</legend>
        <div class="facet-list">${prices.map(b => checkbox('price', b.key, b.label, priceCount(b), state.prices.has(b.key))).join('')}</div>
      </fieldset>` : ''}
      <fieldset class="facet-group">
        <legend>Customer rating</legend>
        <div class="facet-list">${RATINGS.map(r => radio('rating', r.key, r.label, state.rating === r.key)).join('')}</div>
      </fieldset>
      <fieldset class="facet-group">
        <legend>Discount</legend>
        <div class="facet-list">${DISCOUNTS.map(d => radio('discount', d.key, d.label, state.discount === d.key)).join('')}</div>
      </fieldset>
      <fieldset class="facet-group">
        <legend>Availability</legend>
        <div class="facet-list">${checkbox('instock', '1', 'In stock only', undefined, state.inStock)}</div>
      </fieldset>`;
  }

  function activeCount() {
    return state.genres.size + (state.genreQuery ? 1 : 0) + state.prices.size + (state.rating ? 1 : 0) + (state.discount ? 1 : 0) + (state.inStock ? 1 : 0);
  }

  function renderChips() {
    const chips = [];
    state.genres.forEach(g => chips.push({ label: g, clear: () => state.genres.delete(g) }));
    if (state.genreQuery) chips.push({ label: state.genreQuery, clear: () => { state.genreQuery = ''; } });
    state.prices.forEach(k => chips.push({ label: PRICE_BUCKETS.find(b => b.key === k).label, clear: () => state.prices.delete(k) }));
    if (state.rating) chips.push({ label: RATINGS.find(r => r.key === state.rating).label, clear: () => { state.rating = ''; } });
    if (state.discount) chips.push({ label: DISCOUNTS.find(d => d.key === state.discount).label, clear: () => { state.discount = ''; } });
    if (state.inStock) chips.push({ label: 'In stock', clear: () => { state.inStock = false; } });
    if (state.q) chips.push({ label: `“${state.q}”`, clear: () => { state.q = ''; } });
    renderChips.clearers = chips.map(c => c.clear);
    els.chips.innerHTML = chips.length
      ? chips.map((c, i) => `<button type="button" class="filter-chip" data-chip="${i}" aria-label="Remove filter ${esc(c.label)}">${esc(c.label)} <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`).join('') +
        `<button type="button" class="filter-chip filter-chip--clear" data-action="clear">Clear all</button>`
      : '';
    els.chips.hidden = !chips.length;
    const n = activeCount();
    els.filterBadge.textContent = n;
    els.filterBadge.hidden = !n;
  }

  function renderSort() {
    els.sortBar.innerHTML = `<span class="sort-label">Sort by</span>` + SORTS.map(s =>
      `<button type="button" class="sort-opt${state.sort === s.key ? ' active' : ''}" data-sort="${s.key}" aria-pressed="${state.sort === s.key}">${s.label}</button>`).join('');
    els.sortSheetList.innerHTML = SORTS.map(s => radio('sort-m', s.key, s.label, state.sort === s.key)).join('');
    els.sortCurrent.textContent = SORTS.find(s => s.key === state.sort).label;
  }

  function cardHtml(p) {
    const r = ratingOf(p);
    const off = discountOf(p);
    const isOut = stockOf(p) <= 0;
    const t = typeKey(p);
    const imgAttrs = (t === 'apparel' && p.backImage) ? BrushImg.urlAttrs(p.backImage, 480) : BrushImg.attrs(p, 480);
    const fit = (t === 'stickers' || t === 'collectibles') ? ' is-contain' : '';
    return `
      <article class="store-card product-card${isOut ? ' is-out' : ''}" data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-price="${esc(p.price)}" data-original="${esc(p.originalPrice || p.price)}" data-image="${esc(BrushImg.original(p))}" data-stock="${stockOf(p)}" data-product-type="${esc(p.productType || 'poster')}" tabindex="0" aria-label="${esc(p.name)}, ${inr(p.price)}">
        <div class="store-card-media${fit}">
          ${p.badge ? `<span class="store-card-badge">${esc(p.badge)}</span>` : ''}
          <img ${imgAttrs} class="plain-product-image${t === 'apparel' ? ' apparel-card-img' : ''}" alt="" width="480" height="600" loading="lazy" decoding="async">
          ${isOut ? '<span class="store-card-soldout">Out of stock</span>' : ''}
        </div>
        <div class="product-card-info store-card-body">
          <h3>${esc(p.name)}</h3>
          <p class="store-card-meta">${esc(p.category || TYPES.find(x => x.key === t)?.label || '')}</p>
          ${r.count && window.BrushStars ? `<div class="card-rating">${window.BrushStars(r.avg, 'stars-sm')}<span>${r.avg.toFixed(1)} (${r.count})</span></div>` : ''}
          <div class="product-pricing">
            <span class="price-current">${inr(p.price)}</span>
            ${off ? `<span class="price-original">${inr(p.originalPrice)}</span><span class="price-discount">${off}% off</span>` : ''}
          </div>
          <button type="button" class="quick-add-btn store-card-add" ${isOut ? 'disabled' : ''} aria-label="${isOut ? 'Out of stock' : 'Add ' + esc(p.name) + ' to cart'}">${isOut ? 'Out of stock' : 'Add to cart'}</button>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = sorted(products.filter(p => matches(p)));
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    els.count.textContent = list.length
      ? `Showing ${start + 1}–${start + pageItems.length} of ${list.length} ${list.length === 1 ? 'product' : 'products'}`
      : 'No products';
    els.sheetCount.textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'}`;
    els.grid.innerHTML = pageItems.length ? pageItems.map(cardHtml).join('') : `
      <div class="store-empty">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <h3>No matches</h3>
        <p>Try removing a filter or searching for something else.</p>
        ${activeCount() || state.q ? '<button type="button" class="btn-ghost" data-action="clear">Clear all filters</button>' : ''}
      </div>`;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) { els.pagination.innerHTML = ''; return; }
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    els.pagination.innerHTML = `
      <span class="page-status">Page ${state.page} of ${totalPages}</span>
      <div class="page-buttons">
        <button type="button" class="page-btn page-btn--nav" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Prev</button>
        ${pages.map(p => p === '…' ? '<span class="page-ellipsis">…</span>'
          : `<button type="button" class="page-btn${p === state.page ? ' active' : ''}" data-page="${p}" ${p === state.page ? 'aria-current="page"' : ''} aria-label="Page ${p}">${p}</button>`).join('')}
        <button type="button" class="page-btn page-btn--nav" data-page="${state.page + 1}" ${state.page === totalPages ? 'disabled' : ''}>Next <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
      </div>`;
  }

  function renderCopy() {
    const copy = COPY[state.type] || COPY.all;
    els.title.textContent = state.genres.size === 1 && !state.genreQuery ? `${[...state.genres][0]} ${copy.title === 'All Products' ? '' : copy.title}`.trim() : copy.title;
    els.crumb.textContent = copy.title;
    els.intro.textContent = copy.intro;
    document.title = `${els.title.textContent} — Brush`;
    els.reelsPromo.hidden = state.type !== 'posters';
    const reelsHref = 'poster-reels.html' + (state.genres.size === 1 ? '?genre=' + encodeURIComponent([...state.genres][0]) : '');
    els.reelsPromo.querySelector('a').href = reelsHref;
    els.faq.innerHTML = copy.faq.map(item => `
      <div class="faq-item">
        <button type="button" class="faq-question">
          <span class="faq-q-text"><i class="${item.iconStyle || 'fa-solid'} ${item.icon}" aria-hidden="true"></i> ${item.q}</span>
          <i class="fa-solid fa-chevron-down faq-toggle-icon" aria-hidden="true"></i>
        </button>
        <div class="faq-answer"><div class="faq-answer-inner"><p>${item.a}</p></div></div>
      </div>`).join('');
  }

  function render(opts = {}) {
    renderTabs();
    renderCopy();
    if (!opts.keepFacets) renderFacets();
    renderChips();
    renderSort();
    renderGrid();
    writeUrl();
  }

  function update(mutator, opts = {}) {
    mutator();
    state.page = opts.keepPage ? state.page : 1;
    render(opts);
    if (opts.scroll) scrollToResults();
  }

  function scrollToResults() {
    const top = els.results.getBoundingClientRect().top + window.scrollY - 96;
    if (window.lenis) window.lenis.scrollTo(top); else window.scrollTo({ top, behavior: 'smooth' });
  }

  // ---- mobile sheets ----
  let openSheet = null;
  function setSheet(sheet) {
    if (openSheet === sheet) return;
    if (openSheet) {
      openSheet.classList.remove('open');
      if (window.BrushScrollLock) BrushScrollLock.unlock();
    }
    openSheet = sheet;
    els.sheetBackdrop.classList.toggle('open', !!sheet);
    if (sheet) {
      sheet.classList.add('open');
      if (window.BrushScrollLock) BrushScrollLock.lock();
      const focusable = sheet.querySelector('input, button');
      if (focusable) focusable.focus({ preventScroll: true });
    }
  }
  const mobile = window.matchMedia('(max-width: 900px)');

  // ---- events ----
  function bind() {
    els.tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.store-tab');
      if (!b || b.dataset.type === state.type) return;
      update(() => {
        state.type = b.dataset.type;
        state.genres.clear(); state.genreQuery = ''; state.prices.clear();
      });
      b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });

    // Facets: filters apply instantly on desktop; inside the mobile sheet
    // they also apply live (the result count updates behind the sheet) and
    // "Show results" just closes it.
    els.facets.addEventListener('change', (e) => {
      const i = e.target;
      if (i.name === 'genre') update(() => { i.checked ? state.genres.add(i.value) : state.genres.delete(i.value); state.genreQuery = ''; }, { keepFacets: true });
      else if (i.name === 'price') update(() => { i.checked ? state.prices.add(i.value) : state.prices.delete(i.value); }, { keepFacets: true });
      else if (i.name === 'rating') update(() => { state.rating = i.value; }, { keepFacets: true });
      else if (i.name === 'discount') update(() => { state.discount = i.value; }, { keepFacets: true });
      else if (i.name === 'instock') update(() => { state.inStock = i.checked; }, { keepFacets: true });
      refreshFacetCounts();
    });
    let searchTimer;
    els.facets.addEventListener('input', (e) => {
      if (e.target.id !== 'store-search') return;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { update(() => { state.q = e.target.value.trim(); }, { keepFacets: true }); refreshFacetCounts(); }, 200);
    });
    // Radios can't be un-ticked natively — clicking the checked one clears it.
    els.facets.addEventListener('click', (e) => {
      const i = e.target.closest('input[type="radio"]');
      if (i && i.dataset.wasChecked === '1') {
        i.checked = false;
        update(() => { state[i.name] = ''; }, { keepFacets: true });
        refreshFacetCounts();
      }
      els.facets.querySelectorAll('input[type="radio"]').forEach(r => { r.dataset.wasChecked = r.checked ? '1' : ''; });
      const more = e.target.closest('[data-action="more"]');
      if (more) {
        const list = more.previousElementSibling;
        list.classList.toggle('is-expanded');
        more.textContent = list.classList.contains('is-expanded') ? 'Show less' : `+ ${list.children.length - 8} more`;
      }
    });
    els.facets.addEventListener('pointerdown', (e) => {
      const i = e.target.closest('label')?.querySelector('input[type="radio"]');
      if (i) i.dataset.wasChecked = i.checked ? '1' : '';
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="clear"]')) {
        update(() => {
          state.genres.clear(); state.genreQuery = ''; state.prices.clear();
          state.rating = ''; state.discount = ''; state.inStock = false; state.q = '';
        });
        return;
      }
      const chip = e.target.closest('[data-chip]');
      if (chip) { update(() => renderChips.clearers[Number(chip.dataset.chip)]()); return; }
    });

    els.sortBar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sort]');
      if (b) update(() => { state.sort = b.dataset.sort; }, { keepFacets: true });
    });
    els.sortSheetList.addEventListener('change', (e) => {
      update(() => { state.sort = e.target.value; }, { keepFacets: true });
      setTimeout(() => setSheet(null), 150);
    });

    els.pagination.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      update(() => { state.page = Number(b.dataset.page); }, { keepFacets: true, keepPage: true, scroll: true });
    });

    // Keyboard: Enter on a focused card opens it, like a click.
    els.grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('store-card')) e.target.click();
    });

    $('open-filters').addEventListener('click', () => setSheet(els.facetsPanel));
    $('open-sort').addEventListener('click', () => setSheet(els.sortSheet));
    els.sheetBackdrop.addEventListener('click', () => setSheet(null));
    document.querySelectorAll('[data-close-sheet]').forEach(b => b.addEventListener('click', () => setSheet(null)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openSheet) setSheet(null); });
    mobile.addEventListener('change', () => { if (!mobile.matches) setSheet(null); });

    els.faq.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq-question');
      if (!btn) return;
      const item = btn.parentElement;
      const wasActive = item.classList.contains('active');
      els.faq.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!wasActive) item.classList.add('active');
    });
  }

  // Update only the counts/visibility in the facet panel so a click
  // doesn't rebuild the list under the user's finger.
  function refreshFacetCounts() {
    els.facets.querySelectorAll('input[name="genre"]').forEach(i => {
      const n = products.filter(p => (p.category || '').trim() === i.value && matches(p, 'genre')).length;
      const c = i.parentElement.querySelector('.facet-count'); if (c) c.textContent = n;
    });
    els.facets.querySelectorAll('input[name="price"]').forEach(i => {
      const b = PRICE_BUCKETS.find(x => x.key === i.value);
      const n = products.filter(p => p.price >= b.min && p.price <= b.max && matches(p, 'price')).length;
      const c = i.parentElement.querySelector('.facet-count'); if (c) c.textContent = n;
    });
    const clear = els.facets.querySelector('.facet-clear');
    if (clear) clear.hidden = !activeCount();
  }

  async function init() {
    ['tabs', 'facets', 'chips', 'sortBar', 'grid', 'count', 'pagination', 'title', 'crumb', 'intro', 'faq', 'results', 'reelsPromo', 'filterBadge', 'sortSheet', 'sortSheetList', 'sortCurrent', 'sheetBackdrop', 'sheetCount']
      .forEach(k => { els[k] = $('store-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())); });
    els.facetsPanel = $('store-facets-panel');
    bind();

    try {
      const load = window.BrushGetProducts
        ? window.BrushGetProducts()
        : fetch(API_BASE + '/products').then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));
      products = (await load).map(p => (typeof Cart !== 'undefined' ? { ...p, price: Cart.priceFor(p, null).price } : p));
    } catch (err) {
      console.error('Store load error:', err);
      els.grid.innerHTML = `<div class="store-empty"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i><h3>Couldn't load products</h3><p>Our catalogue server may be waking up. Please try again in a few seconds.</p><button type="button" class="btn-ghost" onclick="location.reload()">Retry</button></div>`;
      els.count.textContent = '';
      return;
    }
    byType = {};
    products.forEach(p => { (byType[typeKey(p)] = byType[typeKey(p)] || []).push(p); });
    readUrl();
    render();
    refreshFacetCounts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
