// ========================================
// BRUSH — Smooth scroll (Lenis)
// Skipped entirely when the visitor prefers reduced motion, or if the
// Lenis CDN script failed to load — native (instant) scroll is the
// correct fallback in both cases, not a broken half-smooth state.
// ========================================
(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof Lenis === 'undefined') return;

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Exposed so other scripts (anchor-link handlers, future scroll-linked
  // effects) can route through Lenis instead of fighting it with native
  // window.scrollTo — see script.js's anchor-scroll handler and
  // policies.html's in-page nav for the two current consumers.
  window.lenis = lenis;
})();
