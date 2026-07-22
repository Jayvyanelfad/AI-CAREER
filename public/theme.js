// Dark-only theme enforcement
(function() {
  'use strict';

  const THEME_KEY = 'aicareer-theme';
  const html = document.documentElement;

  function applyDarkTheme() {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
  }

  function hideToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.style.display = 'none';
      toggle.setAttribute('aria-hidden', 'true');
      toggle.disabled = true;
    }
  }

  applyDarkTheme();
  hideToggle();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyDarkTheme();
      hideToggle();
    });
  }
})();