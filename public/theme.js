(function () {
  'use strict';

  if (window.careerPathThemeInitialized) return;
  window.careerPathThemeInitialized = true;

  const STORAGE_KEY = 'aicareer-theme';
  const validThemes = new Set(['dark', 'light', 'system']);
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function getPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return validThemes.has(stored) ? stored : 'dark';
    } catch (_error) {
      return 'dark';
    }
  }

  function applyTheme(preference) {
    const value = validThemes.has(preference) ? preference : 'dark';
    const resolved = value === 'system' && media ? (media.matches ? 'light' : 'dark') : value;
    document.documentElement.dataset.themePreference = value;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.querySelectorAll('[data-theme-preference]').forEach(select => {
      select.value = value;
    });
    document.querySelectorAll('.theme-toggle').forEach(button => {
      const next = resolved === 'dark' ? 'light' : 'dark';
      button.textContent = next[0].toUpperCase() + next.slice(1);
      button.setAttribute('aria-label', `Switch to ${next} theme`);
      button.setAttribute('title', `Switch to ${next} theme (current: ${value})`);
      button.dataset.themePreference = value;
    });
  }

  function savePreference(preference) {
    const value = validThemes.has(preference) ? preference : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_error) {
      // Keep the selected theme for the current page if storage is unavailable.
    }
    applyTheme(value);
  }

  applyTheme(getPreference());
  window.refreshCareerPathTheme = () => applyTheme(getPreference());

  if (media) {
    const updateSystemTheme = () => {
      if (getPreference() === 'system') applyTheme('system');
    };
    if (media.addEventListener) media.addEventListener('change', updateSystemTheme);
    else if (media.addListener) media.addListener(updateSystemTheme);
  }

  function bindThemeControls() {
    document.querySelectorAll('[data-theme-preference]').forEach(select => {
      select.addEventListener('change', () => savePreference(select.value));
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('.theme-toggle');
      if (!button) return;
      const current = document.documentElement.dataset.theme;
      savePreference(current === 'dark' ? 'light' : 'dark');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindThemeControls, { once: true });
  } else {
    bindThemeControls();
  }
})();
