// Canonical per-product-type variant + pricing config. Every price delta a
// shopper can pick (poster size, plate diameter, wallpaper roll size) lives
// here so the server is the single source of truth for order pricing —
// never trust a client-submitted price.
//
// The frontend keeps a matching copy in public/cart.js (browser code can't
// require this Node module without a bundler) — keep both in sync when
// adding a product type or changing a price delta.
const PRODUCT_TYPES = {
  poster: {
    label: 'Poster',
    variantGroups: [
      {
        key: 'size',
        label: 'Size',
        options: [
          { value: 'A4', label: 'A4', priceDelta: 0 },
          { value: 'A5', label: 'A5', priceDelta: -20 },
          { value: 'A3', label: 'A3', priceDelta: 50 }
        ]
      },
      {
        key: 'gsm',
        label: 'Paper Quality',
        options: [
          { value: '80', label: '80 GSM', priceDelta: 0 },
          { value: '140', label: '140 GSM', priceDelta: 40 }
        ]
      }
    ]
  },
  plate: {
    label: 'Decorative Plate',
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
  }
};

// category -> productType. Anything not listed here defaults to 'poster',
// which covers all pre-existing categories without a migration.
const CATEGORY_PRODUCT_TYPE = {
  'Plates': 'plate',
  'Wallpaper': 'wallpaper'
};

function getProductType(category) {
  return CATEGORY_PRODUCT_TYPE[category] || 'poster';
}

// Recomputes price server-side from the submitted variant selections.
// Falls back to each group's first option (delta 0 by convention) when a
// selection is missing or invalid, so a tampered/omitted variant can only
// ever resolve to a real, server-known price — never an arbitrary one.
function priceWithVariants(basePrice, productType, submittedVariants) {
  const typeConfig = PRODUCT_TYPES[productType] || PRODUCT_TYPES.poster;
  let price = basePrice;
  const resolvedVariants = {};

  typeConfig.variantGroups.forEach(group => {
    const submittedValue = submittedVariants ? submittedVariants[group.key] : undefined;
    const option = group.options.find(o => o.value === submittedValue) || group.options[0];
    price += option.priceDelta;
    resolvedVariants[group.key] = option.value;
  });

  return { price, resolvedVariants };
}

// One-line human description of an order item's variants, e.g. "A4 · 80
// GSM" or "10" Round" — handles both new-shape items (`variants` +
// `productType`) and orders placed before multi-product-type support
// existed (flat `size`/`gsm` fields, always a poster).
function formatVariantLine(item) {
  const productType = item.productType || 'poster';
  const typeConfig = PRODUCT_TYPES[productType] || PRODUCT_TYPES.poster;
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

module.exports = { PRODUCT_TYPES, CATEGORY_PRODUCT_TYPE, getProductType, priceWithVariants, formatVariantLine };
