const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.join(__dirname, '..', 'public');
const NAMESPACES = ['nav', 'common', 'coverage', 'programming', 'dashboard', 'dashboardHome',
  'profile', 'certificate', 'certificates', 'exam', 'auth', 'ui', 'page', 'career',
  'careerResult', 'assessment', 'notifications', 'settings', 'lessonVisual', 'learning',
  'project', 'courseMetadata'];
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
  for (const locale of ['fr', 'hinglish', 'sw', 'ar']) {
    const available = new Set(flatKeys(dict(locale)));
    const missing = [...referenced].filter(key => !available.has(key));
    assert.deepEqual(missing, [], `${locale} is missing: ${missing.slice(0, 20).join(', ')}`);
  }
});

test('full locale dictionaries have the same canonical key set as English', () => {
  const canonical = new Set(flatKeys(dict('en')));
  for (const locale of ['fr', 'hinglish', 'sw', 'ar']) {
    const available = new Set(flatKeys(dict(locale)));
    const missing = [...canonical].filter(key => !available.has(key));
    const extra = [...available].filter(key => !canonical.has(key));
    assert.deepEqual(missing, [], `${locale} is missing canonical keys: ${missing.slice(0, 20).join(', ')}`);
    assert.deepEqual(extra, [], `${locale} has unexpected keys: ${extra.slice(0, 20).join(', ')}`);
  }
});

test('partial locales stay parseable with their documented core subset', () => {
  const core = ['common.loading', 'common.startLearning', 'nav.home', 'nav.courses', 'programming.runCode', 'settings.language', 'profile.language', 'career.test', 'assessment.stronglyAgree', 'ui.myCourses'];
  for (const locale of ['ha', 'pcm', 'wo']) {
    const available = new Set(flatKeys(dict(locale)));
    assert.ok(available.size > 100 && available.size < 300, `${locale} must remain an intentional subset, got ${available.size}`);
    for (const key of core) assert.ok(available.has(key), `${locale} must keep core key ${key}`);
  }
});
