const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('lesson visuals cover the requested concepts and do not contain fabricated metrics', () => {
  const source = fs.readFileSync(path.join('public', 'lesson-visuals.js'), 'utf8');
  for (const concept of ['algorithm', 'python', 'aiml', 'rag', 'agent']) assert.match(source, new RegExp(`\\b${concept}\\b`, 'i'));
  assert.match(source, /Concept diagram/);
  assert.doesNotMatch(source, /accuracy\s*[:=]\s*\d|%\s*(accur|improv|growth)/i);
});

test('new locale files are selectable, valid, and intentionally partial', () => {
  const i18n = fs.readFileSync(path.join('public', 'i18n.js'), 'utf8');
  for (const code of ['pcm', 'wo', 'ha']) {
    assert.match(i18n, new RegExp(`code: '${code}'`));
    const locale = JSON.parse(fs.readFileSync(path.join('public', 'locales', `${code}.json`), 'utf8'));
    assert.equal(locale._meta.code, code);
    assert.ok(locale.nav.home && locale.common.loading && locale.notifications.markRead && locale.programming.runCode);
  }
  assert.match(fs.readFileSync(path.join('docs', 'localization-review.md'), 'utf8'), /partial UI translations/i);
});
