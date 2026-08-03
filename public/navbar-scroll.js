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

  function handleNavbarScroll() {
    const scrollY = window.scrollY;
    const barHeight = announcementBar ? announcementBar.offsetHeight : 0;

    if (scrollY > 10) {
      navbar.classList.add('scrolled');
      navbar.style.top = '0';
    } else {
      navbar.classList.remove('scrolled');
      navbar.style.top = barHeight + 'px';
    }

    // Hide on scroll down past the threshold, reveal immediately on any
    // scroll up. Skipped while the search overlay is open — it's anchored
    // at a fixed offset matching the navbar's height, so hiding the navbar
    // out from under it would leave a visual gap.
    const searchOpen = searchOverlayEl && searchOverlayEl.classList.contains('open');
    const scrollingDown = scrollY > lastScrollY;
    if (!searchOpen && scrollingDown && scrollY > NAV_HIDE_THRESHOLD) {
      navbar.classList.add('nav-hidden');
    } else {
      navbar.classList.remove('nav-hidden');
    }
    lastScrollY = scrollY;

    if (progressEl) {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? Math.min(100, (scrollY / scrollableHeight) * 100) : 0;
      progressEl.style.width = progress + '%';
    }
  }

  if (announcementBar) {
    navbar.style.top = announcementBar.offsetHeight + 'px';
  }
  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll();
});
