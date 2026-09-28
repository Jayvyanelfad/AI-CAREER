(function () {
  'use strict';

  const STORAGE_KEY = 'aicareer-language';
  const languages = ['en', 'fr', 'hinglish', 'fon'];
  const names = { en: 'English', fr: 'Français', hinglish: 'Hinglish', fon: 'Fon' };
  const cache = new Map();
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  let activeLanguage = 'en';
  let activeDictionary = {};
  let englishDictionary = {};
  let languageRequest = 0;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (languages.includes(stored)) activeLanguage = stored;
  } catch (_error) { /* English remains available when storage is disabled. */ }

  function lookup(dictionary, key) {
    return key.split('.').reduce((value, part) => value && value[part], dictionary);
  }

  function translate(key, fallback) {
    const english = lookup(englishDictionary, key);
    const selected = lookup(activeDictionary, key);
    if (typeof selected === 'string' && selected.trim()) return selected;
    if (typeof english === 'string' && english.trim()) return english;
    return typeof fallback === 'string' && fallback.trim() ? fallback : key;
  }

  async function load(language) {
    if (cache.has(language)) return cache.get(language);
    const response = await fetch(`locales/${language}.json`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Could not load ${language} translations`);
    const dictionary = await response.json();
    cache.set(language, dictionary);
    return dictionary;
  }

  function flatten(dictionary, prefix = '', result = {}) {
    Object.entries(dictionary).forEach(([key, value]) => {
      if (key === '_meta') return;
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') result[path] = value;
      else if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, result);
    });
    return result;
  }

  function translatedSourceMap() {
    const map = new Map();
    Object.entries(flatten(englishDictionary)).forEach(([key, value]) => {
      if (value) map.set(value.trim(), key);
    });
    return map;
  }

  function localizeTextNodes(root) {
    const sourceMap = translatedSourceMap();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node);
      const trimmed = source.trim();
      let key = sourceMap.get(trimmed);
      let replacement;
      const questionProgress = trimmed.match(/^Question\s+(\d+)\s+of\s+(\d+)$/i);
      if (questionProgress) {
        const template = translate('assessment.questionProgress', 'Question {current} of {total}');
        replacement = template.replace('{current}', questionProgress[1]).replace('{total}', questionProgress[2]);
      } else if (key) replacement = translate(key, source);
      if ((!key && !questionProgress) || !trimmed) continue;
      if (replacement !== trimmed) {
        const start = source.indexOf(trimmed);
        node.nodeValue = `${source.slice(0, start)}${replacement}${source.slice(start + trimmed.length)}`;
      } else if (node.nodeValue !== source) node.nodeValue = source;
    }
  }

  function localizeAttributes(root) {
    const sourceMap = translatedSourceMap();
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [...root.querySelectorAll('*')];
    elements.forEach(element => {
      ['placeholder', 'title', 'aria-label'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        let originals = originalAttributes.get(element);
        if (!originals) { originals = {}; originalAttributes.set(element, originals); }
        if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
        const source = originals[attribute];
        const key = sourceMap.get(source.trim());
        if (key) element.setAttribute(attribute, translate(key, source));
      });
    });
  }

  function createSelector() {
    const select = document.createElement('select');
    select.className = 'nav-language-selector';
    select.dataset.languagePreference = '';
    select.setAttribute('aria-label', translate('settings.language', 'Language'));
    languages.forEach(language => {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = names[language];
      select.appendChild(option);
    });
    select.value = activeLanguage;
    select.addEventListener('change', () => setLanguage(select.value));
    return select;
  }

  function ensureNavigationSelectors() {
    document.querySelectorAll('.auth-responsive-nav').forEach(nav => {
      if (!nav.querySelector(':scope > .nav-language-selector')) nav.appendChild(createSelector());
    });
  }

  function applyExplicitTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const fallback = element.dataset.i18nFallback || element.textContent;
      element.textContent = translate(element.dataset.i18n, fallback);
    });
    document.querySelectorAll('[data-i18n-placeholder], [data-i18n-aria-label]').forEach(element => {
      if (element.dataset.i18nPlaceholder) element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder, element.getAttribute('placeholder') || ''));
      if (element.dataset.i18nAriaLabel) element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel, element.getAttribute('aria-label') || ''));
    });
    document.querySelectorAll('[data-language-preference]').forEach(select => {
      select.value = activeLanguage;
      select.setAttribute('aria-label', translate('settings.language', 'Language'));
    });
  }

  function renderTranslations(root = document) {
    applyExplicitTranslations();
    localizeTextNodes(root);
    localizeAttributes(root);
    ensureNavigationSelectors();
    document.documentElement.lang = activeLanguage === 'hinglish' ? 'en-IN' : activeLanguage === 'fon' ? 'fon' : activeLanguage;
    document.documentElement.dir = 'ltr';
    document.dispatchEvent(new CustomEvent('careerpath:language-change', { detail: { language: activeLanguage } }));
  }

  async function setLanguage(language) {
    const next = languages.includes(language) ? language : 'en';
    const request = ++languageRequest;
    try {
      const [english, selected] = await Promise.all([load('en'), load(next)]);
      if (request !== languageRequest) return;
      englishDictionary = english;
      activeDictionary = selected;
      activeLanguage = next;
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_error) { /* current-page change still applies */ }
    } catch (_error) {
      if (request !== languageRequest) return;
      activeLanguage = 'en';
      try { englishDictionary = await load('en'); activeDictionary = englishDictionary; } catch (_fallbackError) { activeDictionary = {}; englishDictionary = {}; }
    }
    renderTranslations();
  }

  window.t = translate;
  window.setCareerPathLanguage = setLanguage;
  window.getCareerPathLanguage = () => activeLanguage;

  function initialize() {
    renderTranslations();
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          localizeTextNodes(node);
          localizeAttributes(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          localizeTextNodes(node.parentElement || document);
        }
      }));
      ensureNavigationSelectors();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setLanguage(activeLanguage);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
