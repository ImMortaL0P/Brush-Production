// ========================================
// BRUSH — Navbar scroll behavior + scroll progress
// Shared across every page that has a navbar (not just index/all_products,
// which is why this lives outside script.js — checkout/order-confirmation/
// policies don't load script.js at all, since it also carries product
// fetching, modals, and other index-only logic they have no DOM for).
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const announcementBar = document.getElementById('announcement-bar');
  const searchOverlayEl = document.getElementById('search-overlay');
  const progressEl = document.getElementById('scroll-progress');

  let lastScrollY = window.scrollY;
  const NAV_HIDE_THRESHOLD = 120; // px scrolled before hide-on-scroll-down kicks in — avoids hiding right at the top

  const barHeight = announcementBar ? announcementBar.offsetHeight : 0;
  if (announcementBar) {
    navbar.style.top = barHeight + 'px';
    navbar.style.setProperty('--nav-hidden-offset', `calc(-100% - ${barHeight}px)`);
  }

  function handleNavbarScroll() {
    const scrollY = window.scrollY;

    if (scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // The pill navbar stays visible (no hide-on-scroll) — it's centered via
    // transform, so shifting `top` or a translateY would break its centering.
    lastScrollY = scrollY;

    if (progressEl) {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? Math.min(100, (scrollY / scrollableHeight) * 100) : 0;
      progressEl.style.width = progress + '%';
    }
  }

  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll();
});
