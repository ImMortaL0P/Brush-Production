// ========================================
// BRUSH — Image helpers (shared)
//
//  BrushImg.src(product, size)  -> best URL to render for a product card
//  BrushImg.attrs(product, size) -> src + fallback data-attributes string
//  BrushImg.onError(img)         -> staged fallback: thumbnail -> original -> placeholder
//
// Catalog photos are 1–6 MB originals. Resized WebP copies live in
// img/w480/ and img/w1080/ (same relative path, .webp extension) —
// regenerate them after adding products with tools/make-thumbs.py.
// Anything without a thumbnail (e.g. a fresh admin upload) silently falls
// back to the original, and a broken original falls back to a placeholder.
// ========================================
(function () {
  var LOCAL_ROOTS = /^(assets\/(Floral|Mythological|Pop Culture|Travel|Tshirt designs|Stickers|Wallpapers|Figurines)|posters|uploads)\//;
  var PLACEHOLDER_TYPES = { stickers: 1, collectibles: 1, wallpapers: 1 };

  function typeKey(p) {
    return String((p && p.productType) || 'posters').toLowerCase();
  }

  function isDummy(p) {
    var kw = p && p.keywords;
    var list = Array.isArray(kw) ? kw : String(kw || '').split(',');
    return list.some(function (k) { return String(k).trim().toLowerCase() === 'dummy'; }) ||
      /images\.unsplash\.com/.test(String((p && p.image) || ''));
  }

  function placeholder(p) {
    var t = typeKey(p);
    if (!PLACEHOLDER_TYPES[t]) return 'img/placeholders/fallback.webp';
    var n = (Math.abs(parseInt(p.id, 10) || 0) % 6) + 1;
    return 'img/placeholders/' + t + '-' + n + '.webp';
  }

  function relPath(url) {
    if (!url) return null;
    var s = String(url);
    try {
      var u = new URL(s, window.location.href);
      if (u.origin !== window.location.origin) return null;
      s = u.pathname.replace(/^\//, '');
    } catch (e) { return null; }
    try { s = decodeURIComponent(s); } catch (e) {}
    return LOCAL_ROOTS.test(s) ? s : null;
  }

  function thumb(url, size) {
    var rel = relPath(url);
    if (!rel) return null;
    return 'img/w' + (size || 480) + '/' + encodeURI(rel.replace(/\.(jpe?g|png|webp)$/i, '')) + '.webp';
  }

  function original(p) {
    return isDummy(p) ? placeholder(p) : String((p && p.image) || '');
  }

  function src(p, size) {
    var orig = original(p);
    return thumb(orig, size) || orig || placeholder(p);
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function attrs(p, size) {
    return 'src="' + esc(src(p, size)) + '" data-orig="' + esc(original(p)) +
      '" data-fallback="' + esc(placeholder(p)) + '" onerror="BrushImg.onError(this)"';
  }

  function onError(img) {
    var stage = img.dataset.stage || '0';
    var orig = img.dataset.orig;
    if (stage === '0' && orig && img.getAttribute('src') !== orig) {
      img.dataset.stage = '1';
      img.src = orig;
    } else if (stage !== '2') {
      img.dataset.stage = '2';
      img.src = img.dataset.fallback || 'img/placeholders/fallback.webp';
    }
    img.classList.add('loaded');
  }

  // Cart line items only store a URL, not the product — same fallback chain.
  function urlAttrs(url, size) {
    var t = thumb(url, size);
    return 'src="' + esc(t || url) + '" data-orig="' + esc(url) +
      '" data-fallback="img/placeholders/fallback.webp" onerror="BrushImg.onError(this)"';
  }

  // Every product image starts at opacity 0 and fades in once it gets
  // .loaded (styles.css). script.js sets it via inline onload on the cards
  // it renders, but other templates (checkout summary, order confirmation)
  // never did, so their poster mockups stayed invisible. One capture-phase
  // listener covers every page that loads this file.
  var FADE_IN = '.mockup-frame, .mockup-poster, .mockup-hover, .plain-product-image, .modal-plain-image';
  document.addEventListener('load', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.matches(FADE_IN)) t.classList.add('loaded');
  }, true);

  window.BrushImg = { src: src, attrs: attrs, urlAttrs: urlAttrs, onError: onError, original: original, isDummy: isDummy };
})();
