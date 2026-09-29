(function () {
  'use strict';

  // Wave-1A supported languages. English is canonical and the fallback.
  // Fon is intentionally NOT selectable (fon.json has no translations yet).
  const STORAGE_KEY = 'aicareer-language';
  const SUPPORTED = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'hinglish', name: 'Hinglish', nativeName: 'Hinglish' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];
  const SUPPORTED_CODES = SUPPORTED.map(entry => entry.code);
  const cache = new Map();
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const missingKeys = new Set();
  let activeLanguage = 'en';
  let activeDictionary = {};
  let englishDictionary = {};
  let activeMeta = { dir: 'ltr', langTag: 'en' };
  let languageRequest = 0;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Migrate legacy/unsupported stored values (e.g. Fon) to English.
    if (SUPPORTED_CODES.includes(stored)) activeLanguage = stored;
    else if (stored) localStorage.setItem(STORAGE_KEY, 'en');
  } catch (_error) { /* English remains available when storage is disabled. */ }

  function lookup(dictionary, key) {
    if (!dictionary || typeof key !== 'string' || !key) return undefined;
    return key.split('.').reduce((value, part) => (
      value && typeof value === 'object' ? value[part] : undefined
    ), dictionary);
  }

  function safeString(value) {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  function interpolate(template, vars) {
    if (!vars || typeof vars !== 'object') return template;
    return Object.entries(vars).reduce((text, [name, value]) => {
      if (value === undefined || value === null) return text;
      return text.split(`{${name}}`).join(String(value));
    }, template);
  }

  // translate(key, fallback, vars) — selected language, then English, then the
  // provided fallback, then the key itself. Never returns undefined, null, or
  // "[object Object]".
  function translate(key, fallback, vars) {
    let template;
    if (typeof key === 'string' && key) {
      const selected = lookup(activeDictionary, key);
      const english = lookup(englishDictionary, key);
      template = safeString(selected) || safeString(english);
      if (!template && activeLanguage !== 'en' && !missingKeys.has(key)) {
        missingKeys.add(key);
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(`[i18n] missing translation for "${key}" (${activeLanguage}); used English fallback.`);
        }
      }
    }
    if (!template) template = safeString(fallback) || (typeof key === 'string' && key ? key : '');
    return interpolate(template, vars);
  }

  async function load(language) {
    if (cache.has(language)) return cache.get(language);
    const response = await fetch(`locales/${language}.json`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Could not load ${language} translations`);
    const dictionary = await response.json();
    cache.set(language, dictionary);
    return dictionary;
  }

  function metaOf(dictionary, code) {
    const meta = (dictionary && dictionary._meta) || {};
    return {
      dir: meta.dir === 'rtl' ? 'rtl' : 'ltr',
      langTag: typeof meta.langTag === 'string' && meta.langTag ? meta.langTag : code
    };
  }

  function flatten(dictionary, prefix = '', result = {}) {
    if (!dictionary || typeof dictionary !== 'object') return result;
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
    const scope = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement || document;
    if (!scope) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      // Never rewrite code, URLs, or other literal content.
      if (parent && parent.closest('code, pre, kbd, samp, script, style')) continue;
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node);
      const trimmed = source.trim();
      if (!trimmed) continue;
      let key = sourceMap.get(trimmed);
      let replacement;
      const questionProgress = trimmed.match(/^Question\s+(\d+)\s+of\s+(\d+)$/i);
      if (questionProgress) {
        replacement = translate('assessment.questionProgress', 'Question {current} of {total}', {
          current: questionProgress[1],
          total: questionProgress[2]
        });
      } else if (key) {
        replacement = translate(key, source);
      } else continue;
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
        if (typeof source !== 'string') return;
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
    SUPPORTED.forEach(entry => {
      const option = document.createElement('option');
      option.value = entry.code;
      option.textContent = entry.nativeName;
      select.appendChild(option);
    });
    // Fon is not translated yet: visible but not selectable.
    const fonOption = document.createElement('option');
    fonOption.value = 'fon';
    fonOption.textContent = translate('coverage.fonComingSoon', 'Fon (coming soon)');
    fonOption.disabled = true;
    select.appendChild(fonOption);
    select.value = activeLanguage;
    select.addEventListener('change', () => {
      if (select.value === 'fon') { select.value = activeLanguage; return; }
      setLanguage(select.value);
    });
    return select;
  }

  function syncHardcodedSelectors() {
    // Pages with a hardcoded <select data-language-preference> (profile.html):
    // rebuild options from the supported list so new languages appear and
    // unsupported ones (Fon) are marked coming soon instead of selectable.
    document.querySelectorAll('select[data-language-preference]').forEach(select => {
      if (select.classList.contains('nav-language-selector')) return;
      select.innerHTML = '';
      SUPPORTED.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.code;
        option.textContent = entry.nativeName;
        select.appendChild(option);
      });
      const fonOption = document.createElement('option');
      fonOption.value = 'fon';
      fonOption.textContent = translate('coverage.fonComingSoon', 'Fon (coming soon)');
      fonOption.disabled = true;
      select.appendChild(fonOption);
      select.value = activeLanguage;
      select.setAttribute('aria-label', translate('settings.language', 'Language'));
      if (!select.dataset.i18nBound) {
        select.dataset.i18nBound = 'true';
        select.addEventListener('change', () => {
          if (select.value === 'fon') { select.value = activeLanguage; return; }
          setLanguage(select.value);
        });
      }
    });
  }

  function ensureNavigationSelectors() {
    document.querySelectorAll('.auth-responsive-nav').forEach(nav => {
      if (!nav.querySelector(':scope > .nav-language-selector')) nav.appendChild(createSelector());
    });
  }

  function applyExplicitTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const vars = element.dataset.i18nVars ? safeJsonVars(element.dataset.i18nVars) : undefined;
      const fallback = element.dataset.i18nFallback || element.textContent;
      element.textContent = translate(element.dataset.i18n, fallback, vars);
    });
    document.querySelectorAll('[data-i18n-placeholder], [data-i18n-aria-label]').forEach(element => {
      if (element.dataset.i18nPlaceholder) element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder, element.getAttribute('placeholder') || ''));
      if (element.dataset.i18nAriaLabel) element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel, element.getAttribute('aria-label') || ''));
    });
    document.querySelectorAll('[data-language-preference]').forEach(select => {
      if (select.tagName === 'SELECT') select.value = activeLanguage === 'fon' ? 'en' : activeLanguage;
      select.setAttribute('aria-label', translate('settings.language', 'Language'));
    });
  }

  function safeJsonVars(raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function renderTranslations(root = document) {
    applyExplicitTranslations();
    localizeTextNodes(root);
    localizeAttributes(root);
    syncHardcodedSelectors();
    ensureNavigationSelectors();
    document.documentElement.lang = activeMeta.langTag;
    // Direction comes from locale metadata (Arabic = rtl).
    document.documentElement.dir = activeMeta.dir;
    document.dispatchEvent(new CustomEvent('careerpath:language-change', { detail: { language: activeLanguage } }));
  }

  async function setLanguage(language) {
    const next = SUPPORTED_CODES.includes(language) ? language : 'en';
    const request = ++languageRequest;
    try {
      const [english, selected] = await Promise.all([load('en'), load(next)]);
      if (request !== languageRequest) return;
      englishDictionary = english;
      activeDictionary = selected;
      activeMeta = metaOf(selected, next);
      activeLanguage = next;
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_error) { /* current-page change still applies */ }
    } catch (_error) {
      if (request !== languageRequest) return;
      activeLanguage = 'en';
      try { englishDictionary = await load('en'); activeDictionary = englishDictionary; } catch (_fallbackError) { activeDictionary = {}; englishDictionary = {}; }
      activeMeta = metaOf(englishDictionary, 'en');
    }
    renderTranslations();
  }

  window.t = translate;
  window.setCareerPathLanguage = setLanguage;
  window.getCareerPathLanguage = () => activeLanguage;
  window.getCareerPathLanguages = () => SUPPORTED.map(entry => ({ ...entry }));

  function initialize() {
    renderTranslations();
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          if (node.matches && node.matches('select[data-language-preference]')) syncHardcodedSelectors();
          else if (node.querySelector) {
            const nested = node.querySelector('select[data-language-preference]');
            if (nested) syncHardcodedSelectors();
          }
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
