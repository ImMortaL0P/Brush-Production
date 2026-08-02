// ========================================
// BRUSH — Light/Dark theme toggle
// Dark is the default for every fresh visit; a visitor's explicit
// choice is remembered (localStorage) so it holds across page loads.
// ========================================
(function () {
  var STORAGE_KEY = 'brush-theme';
  var root = document.documentElement;

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  // Applied synchronously, before first paint, so there's no flash of the wrong theme.
  applyTheme(stored === 'light' ? 'light' : 'dark');

  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
  });

  window.BrushTheme = { toggle: toggleTheme, apply: applyTheme };
})();
