const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.join(__dirname, '..', 'public');
const NAMESPACES = ['nav', 'common', 'coverage', 'programming', 'dashboard', 'dashboardHome',
  'profile', 'certificate', 'certificates', 'exam', 'auth', 'ui', 'page', 'career',
  'careerResult', 'assessment', 'notifications', 'settings', 'lessonVisual', 'learning',
  'project', 'courseMetadata', 'tour'];
const KEY_RE = new RegExp(`['"]((?:${NAMESPACES.join('|')})\\.[A-Za-z0-9_.]+)['"]`, 'g');
// Namespaces resolved at runtime (per-course/per-index keys with fallbacks).
const RUNTIME_PREFIXES = ['courseMetadata.', 'coverage.presentPrompt'];

function referencedKeys() {
  const found = new Set();
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(js|html)$/.test(entry.name)) continue;
      if (entry.name === 'admin.js') continue; // separate tr()/admin-locales system
      const content = fs.readFileSync(full, 'utf8');
      let match;
      KEY_RE.lastIndex = 0;
      while ((match = KEY_RE.exec(content)) !== null) {
        const key = match[1];
        if (key.includes('${')) continue;
        if (/\.(html|js|css|json)$/.test(key)) continue; // filenames, not keys
        if (RUNTIME_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
        found.add(key);
      }
    }
  };
  walk(PUBLIC);
  return found;
}

function flatKeys(obj, prefix = '', out = []) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) flatKeys(value, `${prefix}${key}.`, out);
    else out.push(`${prefix}${key}`);
  }
  return out;
}

const dict = locale => JSON.parse(fs.readFileSync(path.join(PUBLIC, 'locales', `${locale}.json`), 'utf8'));

test('every statically referenced interface key exists in canonical English', () => {
  const referenced = referencedKeys();
  assert.ok(referenced.size > 300, `expected hundreds of referenced keys, got ${referenced.size}`);
  const en = new Set(flatKeys(dict('en')));
  const missing = [...referenced].filter(key => !en.has(key));
  assert.deepEqual(missing, [], `keys used in code but missing from en.json: ${missing.slice(0, 20).join(', ')}`);
});

test('full locales have zero missing interface keys', () => {
  const referenced = referencedKeys();
  // pcm (Naijá) graduated to a full locale: every referenced key exists,
  // with proper nouns/brand/code intentionally kept in English.
  for (const locale of ['fr', 'hinglish', 'sw', 'ar', 'pcm']) {
    const available = new Set(flatKeys(dict(locale)));
    const missing = [...referenced].filter(key => !available.has(key));
    assert.deepEqual(missing, [], `${locale} is missing: ${missing.slice(0, 20).join(', ')}`);
  }
});

test('pcm key set matches canonical English with translations applied', () => {
  const en = dict('en');
  const pcm = dict('pcm');
  const enKeys = new Set(flatKeys(en));
  const pcmKeys = new Set(flatKeys(pcm));
  const missing = [...enKeys].filter(key => !pcmKeys.has(key) && !key.startsWith('_meta.'));
  assert.deepEqual(missing, [], `pcm missing en keys: ${missing.slice(0, 20).join(', ')}`);
  const flatten = (obj, prefix = '', out = {}) => {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, `${prefix}${key}.`, out);
      else out[`${prefix}${key}`] = value;
    }
    return out;
  };
  const enFlat = flatten(en);
  const pcmFlat = flatten(pcm);
  // Proper nouns, brand names, code tokens and illustrative example data
  // intentionally stay in English; everything else must differ from English.
  // Naijá borrows many English nouns (Home, Courses, Dashboard, job titles,
  // brand names, code tokens); identical strings there are legitimate
  // loanwords, not missing translations. The floor below guards against
  // regressions while zero-missing-keys above is the strong guarantee.
  const identical = Object.keys(enFlat).filter(key =>
    !key.startsWith('_meta.') && typeof enFlat[key] === 'string' && pcmFlat[key] === enFlat[key]);
  const translatedShare = 1 - identical.length / Object.keys(enFlat).filter(k => !k.startsWith('_meta.')).length;
  assert.ok(translatedShare > 0.55, `expected >55% of pcm strings translated, got ${(translatedShare * 100).toFixed(1)}% (${identical.length} identical)`);
});

test('partial locales stay parseable with their documented core subset', () => {
  const core = ['common.loading', 'nav.home', 'nav.courses', 'programming.runCode', 'settings.language'];
  for (const locale of ['ha', 'wo']) {
    const available = new Set(flatKeys(dict(locale)));
    assert.ok(available.size > 0 && available.size < 100, `${locale} must remain an intentional subset, got ${available.size}`);
    for (const key of core) assert.ok(available.has(key), `${locale} must keep core key ${key}`);
  }
});
