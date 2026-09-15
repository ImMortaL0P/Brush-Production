// ========================================
// BRUSH — Motion (portfolio aesthetic)
// GSAP + ScrollTrigger, ported from the revamped Portfolio-Final.
//
// Two additive effects, both OPT-IN so they never fight existing CSS or
// JS motion, and both gated behind prefers-reduced-motion (native flow
// is the correct fallback, same rule scroll.js and micro-interactions.js
// already follow):
//
//   1. Hero — a staggered rise/blur-in of the hero content block on load.
//   2. Scroll reveals — any element marked data-reveal rises into place
//      once as it scrolls into view.
//
// Lenis owns smooth scroll; this routes GSAP's ticker and ScrollTrigger
// through it so reveal pins/triggers track the (non-native) scroll pos.
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Route GSAP through Lenis so ScrollTrigger measures the animated scroll.
  if (window.lenis) {
    window.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => window.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // --- 1. Hero: staggered rise into place -------------------------------
  const hero = document.querySelector('.hero-content');
  if (hero) {
    gsap.from('.hero-content > *', {
      y: 30,
      opacity: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.15
    });
  }


  // --- 2. Scroll reveals: data-reveal rises in once ---------------------
  // Staggered reveals for grids
  const featureItems = gsap.utils.toArray('.feature-item');
  if (featureItems.length) {
    gsap.from(featureItems, {
      y: 30, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.features-grid', start: 'top 85%', once: true }
    });
  }

  const trustedLogos = gsap.utils.toArray('.trusted-logo');
  if (trustedLogos.length) {
    gsap.from(trustedLogos, {
      y: 20, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.trusted-logos', start: 'top 85%', once: true }
    });
  }

  const categoryCards = gsap.utils.toArray('.category-card');
  if (categoryCards.length) {
    gsap.from(categoryCards, {
      y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.categories-grid', start: 'top 80%', once: true }
    });
  }

  const reveals = gsap.utils.toArray('[data-reveal], .fade-in, .scale-in').filter(el => 
    !el.classList.contains('feature-item') && !el.classList.contains('trusted-logo') && !el.classList.contains('category-card') && !el.closest('.hero-content')
  );
  
  if (reveals.length) {
    reveals.forEach((el) => {
      gsap.from(el, {
        y: 26,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });
  }


  // Re-measure triggers once images settle so nothing is pinned off-target.
  window.addEventListener('load', () => ScrollTrigger.refresh());
});