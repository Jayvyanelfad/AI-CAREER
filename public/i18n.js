(function () {
  'use strict';

  const STORAGE_KEY = 'aicareer-language';
  const supported = new Set(['en', 'fr', 'ar', 'hi', 'sw']);
  const cache = new Map();
  let activeLanguage = 'en';
  let activeDictionary = {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (supported.has(stored)) activeLanguage = stored;
  } catch (_error) {
    // English remains available when browser storage is disabled.
  }

  function lookup(dictionary, key) {
    return key.split('.').reduce((value, part) => value && value[part], dictionary);
  }

  function translate(key, fallback = key) {
    const result = lookup(activeDictionary, key);
    return typeof result === 'string' ? result : fallback;
  }

  async function load(language) {
    if (cache.has(language)) return cache.get(language);
    const response = await fetch(`locales/${language}.json`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Translation unavailable');
    const dictionary = await response.json();
    cache.set(language, dictionary);
    return dictionary;
  }

  function applyDocumentLanguage(language) {
    // Keep document semantics aligned with the copy actually rendered. Until a
    // page opts into translated strings through these markers, its UI stays English.
    const hasTranslatedCopy = Boolean(document.querySelector('[data-i18n], [data-i18n-placeholder], [data-i18n-aria-label]'));
    const renderedLanguage = hasTranslatedCopy ? language : 'en';
    document.documentElement.lang = renderedLanguage;
    document.documentElement.dir = renderedLanguage === 'ar' ? 'rtl' : 'ltr';
  }

  function renderTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = translate(element.dataset.i18n, element.dataset.i18nFallback || element.textContent);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder, element.getAttribute('placeholder') || ''));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel, element.getAttribute('aria-label') || ''));
    });
    document.querySelectorAll('[data-language-preference]').forEach(select => {
      select.value = activeLanguage;
    });
    document.dispatchEvent(new CustomEvent('careerpath:language-change', { detail: { language: activeLanguage } }));
  }

  async function setLanguage(language) {
    const next = supported.has(language) ? language : 'en';
    try {
      const dictionary = await load(next);
      activeLanguage = next;
      activeDictionary = dictionary;
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_error) { /* current-page selection still applies */ }
    } catch (_error) {
      if (next !== 'en') {
        activeLanguage = 'en';
        activeDictionary = await load('en').catch(() => ({}));
      }
    }
    applyDocumentLanguage(activeLanguage);
    renderTranslations();
  }

  window.t = translate;
  window.setCareerPathLanguage = setLanguage;
  window.getCareerPathLanguage = () => activeLanguage;
  applyDocumentLanguage(activeLanguage);

  function initialize() {
    document.querySelectorAll('[data-language-preference]').forEach(select => {
      select.addEventListener('change', () => setLanguage(select.value));
    });
    setLanguage(activeLanguage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
