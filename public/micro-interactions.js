// ========================================
// BRUSH — Micro-interactions: custom cursor + magnetic CTA buttons
// Shared across the same pages as navbar-scroll.js. Both effects are purely
// decorative motion (not functional UI state), so both are gated behind
// prefers-reduced-motion, and neither makes sense without a real mouse, so
// both are also gated behind pointer:fine (touch/coarse pointers bail out).
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (prefersReducedMotion || !hasFinePointer) return;

  initCustomCursor();
  initMagneticButtons();

  function initCustomCursor() {
    const dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    document.body.append(dot);
    document.body.classList.add('custom-cursor-active');

    let shown = false;

    window.addEventListener('mousemove', (e) => {
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      if (!shown) {
        shown = true;
        dot.style.opacity = '1';
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      shown = false;
      dot.style.opacity = '0';
    });
  }

  function initMagneticButtons() {
    const MAGNETIC_SELECTOR = '.hero-cta, .modal-add-to-cart, .cart-checkout-btn';
    const STRENGTH = 0.35;
    const MAX_OFFSET = 14; // px — keeps the pull subtle rather than the button chasing the cursor
    const PULL_TRANSITION = 'transform 0.15s ease-out, box-shadow var(--transition-med), background var(--transition-fast)';
    const RELEASE_TRANSITION = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow var(--transition-med), background var(--transition-fast)';

    document.querySelectorAll(MAGNETIC_SELECTOR).forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        const x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, relX * STRENGTH));
        const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, relY * STRENGTH));
        btn.style.transition = PULL_TRANSITION;
        btn.style.setProperty('--magnet-x', `${x}px`);
        btn.style.setProperty('--magnet-y', `${y}px`);
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transition = RELEASE_TRANSITION;
        btn.style.setProperty('--magnet-x', '0px');
        btn.style.setProperty('--magnet-y', '0px');
      });
    });
  }
});
