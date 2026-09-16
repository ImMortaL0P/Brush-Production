// ========================================
// BRUSH — Navbar scroll behavior + scroll progress
// Shared across every page that has a navbar.
//
// The announcement bar scrolls away with the page, so the floating pill
// navbar sits just below it at the very top and glides up to its resting
// 16px gap as the bar leaves the viewport (instead of staying parked at
// the bar's height and leaving an odd gap for the rest of the page).
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const announcementBar = document.getElementById('announcement-bar');
  const progressEl = document.getElementById('scroll-progress');
  const REST_GAP = window.matchMedia('(max-width: 480px)').matches ? 10 : 16;

  let barHeight = announcementBar ? announcementBar.offsetHeight : 0;
  let ticking = false;

  function update() {
    ticking = false;
    const scrollY = window.scrollY;

    navbar.classList.toggle('scrolled', scrollY > 10);

    const top = Math.max(REST_GAP, barHeight + REST_GAP - scrollY);
    navbar.style.setProperty('--nav-top', top + 'px');

    if (progressEl) {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, scrollY / scrollable) : 0;
      progressEl.style.transform = `scaleX(${progress})`;
    }
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => {
    barHeight = announcementBar ? announcementBar.offsetHeight : 0;
    requestUpdate();
  });
  update();
});
