// Canonical per-product-type variant + pricing config. Every price delta a
// shopper can pick (poster size, plate diameter, wallpaper roll size) lives
// here so the server is the single source of truth for order pricing —
// never trust a client-submitted price.
//
// The frontend keeps a matching copy in public/cart.js (browser code can't
// require this Node module without a bundler) — keep both in sync when
// adding a product type or changing a price delta.
const PRODUCT_TYPES = {
  // ------------------------------------------------------------------
  // POSTERS & T-SHIRTS are fulfilled by Qikink (print-on-demand).
  // Shelf price = ceil((Qikink product + printing) × 1.15) — the 15% Brush
  // margin. GST and shipping are NOT in the shelf price; they're added once
  // per order at checkout by orderCharges() below.
  // Rates from qikink.com product pages, Sep 2026:
  //   Paper poster (300 GSM art board): A5/8x10 ₹30 · A4/10x10 ₹40 ·
  //   A3/12x24 ₹50 · 11x14 ₹60 · 12x16/12x18/14x14 ₹80 · 16x24/18x24 ₹120
  //   UC21 Classic Crew ₹190 · UC48 Stretch ₹260 · MP25 Polo ₹320
  //   Print per tee = back A3 (193 sq.in × ₹0.75 = ₹145) + chest pocket
  //   (DTF ₹50, DTG ₹60 on a coloured garment).
  // `basePrice` makes these prices absolute: the product's DB `price` is
  // ignored for these types, so every poster/tee is priced from this table.
  // `gstRate` is the GST charged on that type at checkout.
  // ------------------------------------------------------------------
  poster: {
    label: 'Poster',
    basePrice: 46, // A4 — Qikink ₹40 × 1.15
    gstRate: 0.12,
    // Qikink cost (product + printing, ex-GST/shipping) per size — shown in
    // the admin Pricing view alongside the shelf price and margin.
    qikinkCost: {
      size: { A4: 40, A5: 30, A3: 50, '8x10': 30, '10x10': 40, '11x14': 60, '12x16': 80, '12x18': 80, '14x14': 80, '12x24': 50, '16x24': 120, '18x24': 120 }
    },
    variantGroups: [
      {
        key: 'size',
        label: 'Size',
        options: [
          { value: 'A4', label: 'A4', priceDelta: 0 },         // ₹46  (Qikink ₹40)
          { value: 'A5', label: 'A5', priceDelta: -11 },       // ₹35  (₹30)
          { value: 'A3', label: 'A3', priceDelta: 12 },        // ₹58  (₹50)
          { value: '8x10', label: '8×10″', priceDelta: -11 },  // ₹35  (₹30)
          { value: '10x10', label: '10×10″', priceDelta: 0 },  // ₹46  (₹40)
          { value: '11x14', label: '11×14″', priceDelta: 23 }, // ₹69  (₹60)
          { value: '12x16', label: '12×16″', priceDelta: 46 }, // ₹92  (₹80)
          { value: '12x18', label: '12×18″', priceDelta: 46 }, // ₹92  (₹80)
          { value: '14x14', label: '14×14″', priceDelta: 46 }, // ₹92  (₹80)
          { value: '12x24', label: '12×24″', priceDelta: 12 }, // ₹58  (₹50)
          { value: '16x24', label: '16×24″', priceDelta: 92 }, // ₹138 (₹120)
          { value: '18x24', label: '18×24″', priceDelta: 92 }  // ₹138 (₹120)
        ]
      }
    ]
  },
  apparel: {
    label: 'T-Shirt',
    basePrice: 443, // UC21 Classic Crew, DTF — Qikink ₹190 + ₹195 print = ₹385 × 1.15
    gstRate: 0.05,
    // Qikink cost = garment (by style) + printing (by method: back A3 + chest).
    qikinkCost: {
      style: { uc21: 190, uc48: 260, mp25: 320 },
      print: { dtf: 195, dtg: 205 }
    },
    variantGroups: [
      {
        key: 'style',
        label: 'Fit',
        options: [
          { value: 'uc21', label: 'Classic Crew · 180 GSM', priceDelta: 0 },  // ₹443 (₹385)
          { value: 'uc48', label: 'Stretch Tee · 240 GSM', priceDelta: 81 },  // ₹524 (₹455)
          { value: 'mp25', label: 'Polo · 220 GSM', priceDelta: 150 }         // ₹593 (₹515)
        ]
      },
      {
        key: 'print',
        label: 'Print',
        options: [
          { value: 'dtf', label: 'DTF', priceDelta: 0 },
          { value: 'dtg', label: 'DTG', priceDelta: 12, onlyWith: { style: ['uc21'] } } // ₹455 (₹395)
        ]
      },
      {
        key: 'size',
        label: 'Size',
        defaultValue: 'M',
        options: [
          { value: 'XS', label: 'XS', priceDelta: 0, onlyWith: { style: ['uc21', 'uc48'] } },
          { value: 'S', label: 'S', priceDelta: 0 },
          { value: 'M', label: 'M', priceDelta: 0 },
          { value: 'L', label: 'L', priceDelta: 0 },
          { value: 'XL', label: 'XL', priceDelta: 0 },
          { value: '2XL', label: '2XL', priceDelta: 0 },
          { value: '3XL', label: '3XL', priceDelta: 0, onlyWith: { style: ['uc48', 'mp25'] } }
        ]
      }
    ]
  },
  plate: {
    label: 'Decorative Plate',
    gstRate: 0.18,
    variantGroups: [
      {
        key: 'size',
        label: 'Plate Size',
        options: [
          { value: '8in', label: '8" Round', priceDelta: 0 },
          { value: '10in', label: '10" Round', priceDelta: 80 },
          { value: '12in', label: '12" Round', priceDelta: 150 }
        ]
      }
    ]
  },
  wallpaper: {
    label: 'Wallpaper',
    gstRate: 0.18,
    variantGroups: [
      {
        key: 'roll',
        label: 'Roll Size',
        options: [
          { value: '1x3m', label: '1m × 3m Roll', priceDelta: 0 },
          { value: '1.5x3m', label: '1.5m × 3m Roll', priceDelta: 300 }
        ]
      }
    ]
  },
  generic: {
    label: 'Product',
    gstRate: 0.18,
    variantGroups: []
  }
};

// category -> productType. Anything not listed here defaults to 'poster',
// which covers all pre-existing categories without a migration.
const CATEGORY_PRODUCT_TYPE = {
  'Plates': 'plate',
  'Wallpaper': 'wallpaper',
  'Apparel': 'apparel'
};

// Maps whatever productType string a product carries ('Posters', 'poster',
// 'apparel', 'Wallpapers', …) onto a config key. Unknown types (stickers,
// collectibles) get 'generic' — no variants, DB price as-is — instead of
// silently inheriting poster sizes and poster pricing.
function normalizeProductType(productType, category) {
  const t = String(productType || '').trim().toLowerCase();
  if (!t) {
    const c = String(category || '').trim().toLowerCase();
    if (c === 'apparel') return 'apparel';
    if (c === 'plates') return 'plate';
    if (c === 'wallpaper' || c === 'wallpapers') return 'wallpaper';
    return 'poster';
  }
  if (t === 'poster' || t === 'posters') return 'poster';
  if (t === 'apparel' || t === 't-shirt' || t === 'tshirt' || t === 't-shirts') return 'apparel';
  if (t === 'plate' || t === 'plates') return 'plate';
  if (t === 'wallpaper' || t === 'wallpapers') return 'wallpaper';
  return 'generic';
}

function optionAllowed(option, chosen) {
  if (!option.onlyWith) return true;
  return Object.keys(option.onlyWith).every(k => option.onlyWith[k].includes(chosen[k]));
}

// Resolves a (possibly partial / tampered) variant selection to a valid
// combination, group by group in order. An option that is missing, unknown
// or not allowed with the earlier choices (e.g. DTG on a Polo, 3XL on the
// Classic Crew) falls back to the group's default — so a request can only
// ever resolve to a real, known price.
function resolveVariants(typeConfig, submitted) {
  const chosen = {};
  let delta = 0;
  (typeConfig.variantGroups || []).forEach(group => {
    const allowed = group.options.filter(o => optionAllowed(o, chosen));
    const want = submitted ? submitted[group.key] : undefined;
    const option = allowed.find(o => o.value === want)
      || allowed.find(o => o.value === group.defaultValue)
      || allowed[0];
    if (!option) return;
    chosen[group.key] = option.value;
    delta += option.priceDelta;
  });
  return { variants: chosen, delta };
}

function unitPrice(dbPrice, typeConfig, submitted) {
  const { variants, delta } = resolveVariants(typeConfig, submitted);
  const base = typeof typeConfig.basePrice === 'number' ? typeConfig.basePrice : Number(dbPrice) || 0;
  return { price: base + delta, variants };
}

// Per-order charges added at checkout, on top of shelf prices.
// Shipping and the COD fee are passed through at Qikink's rate; GST is
// charged on the items (at each type's gstRate) and at 18% on shipping/COD.
const ORDER_CHARGES = {
  shipping: 54,       // Qikink shipping, per order
  codFee: 34,         // Qikink COD handling, cash-on-delivery orders only
  serviceGstRate: 0.18
};

const round2 = (n) => Math.round(n * 100) / 100;

// lines: [{ price, quantity, productType }]
function orderCharges(lines, paymentMethod) {
  let subtotal = 0;
  let itemGst = 0;
  (lines || []).forEach(l => {
    const lineTotal = (Number(l.price) || 0) * (Number(l.quantity) || 0);
    const cfg = PRODUCT_TYPES[normalizeProductType(l.productType)] || PRODUCT_TYPES.generic;
    subtotal += lineTotal;
    itemGst += lineTotal * (cfg.gstRate != null ? cfg.gstRate : 0.18);
  });
  const hasItems = subtotal > 0;
  const shipping = hasItems ? ORDER_CHARGES.shipping : 0;
  const codFee = hasItems && paymentMethod === 'cod' ? ORDER_CHARGES.codFee : 0;
  const gst = round2(itemGst + (shipping + codFee) * ORDER_CHARGES.serviceGstRate);
  const total = Math.round(subtotal + gst + shipping + codFee); // charged in whole rupees
  return { subtotal: round2(subtotal), gst, shipping, codFee, discount: 0, total };
}

function getProductType(category) {
  return CATEGORY_PRODUCT_TYPE[category] || 'poster';
}

// Recomputes price server-side from the submitted variant selections.
// Falls back to each group's first option (delta 0 by convention) when a
// selection is missing or invalid, so a tampered/omitted variant can only
// ever resolve to a real, server-known price — never an arbitrary one.
function priceWithVariants(basePrice, productType, submittedVariants) {
  const typeConfig = PRODUCT_TYPES[normalizeProductType(productType)] || PRODUCT_TYPES.generic;
  const { price, variants } = unitPrice(basePrice, typeConfig, submittedVariants);
  return { price, resolvedVariants: variants };
}

// One-line human description of an order item's variants, e.g. "A4 · 80
// GSM" or "10" Round" — handles both new-shape items (`variants` +
// `productType`) and orders placed before multi-product-type support
// existed (flat `size`/`gsm` fields, always a poster).
function formatVariantLine(item) {
  const productType = normalizeProductType(item.productType || 'poster');
  const typeConfig = PRODUCT_TYPES[productType] || PRODUCT_TYPES.generic;
  const variants = item.variants || (item.size || item.gsm ? { size: item.size || 'A4', gsm: item.gsm || '80' } : null);
  if (!variants) return '';

  return typeConfig.variantGroups
    .filter(group => variants[group.key] !== undefined)
    .map(group => {
      const option = group.options.find(o => o.value === variants[group.key]);
      return option ? option.label : `${group.label}: ${variants[group.key]}`;
    })
    .join(' · ');
}

module.exports = { PRODUCT_TYPES, ORDER_CHARGES, orderCharges, CATEGORY_PRODUCT_TYPE, getProductType, normalizeProductType, resolveVariants, priceWithVariants, formatVariantLine };
