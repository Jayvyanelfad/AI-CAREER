const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const studio = fs.readFileSync(path.join(__dirname, '..', 'public', 'programming.js'), 'utf8');
const provider = fs.readFileSync(path.join(__dirname, '..', 'programming-execution-provider.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'programming.html'), 'utf8');

test('unavailable status disables Run and corrects the sandbox promise', () => {
  // Run buttons are disabled with an explanatory title.
  assert.match(studio, /querySelectorAll\('\[data-run-code\]'\)\.forEach/);
  assert.match(studio, /button\.disabled = true/);
  // The per-lesson practice note (which advertises a sandbox) is rewritten
  // wherever Run is disabled, so the page never promises missing execution.
  assert.match(studio, /programming-practice-note/);
  assert.match(studio, /practiceNote\.textContent/);
  // The provider note is announced to assistive tech.
  assert.match(studio, /setAttribute\('role', 'status'\)/);
  // A status-check failure still leaves Run as the source of truth.
  assert.match(studio, /remains the source of truth/);
});

test('the studio never executes learner code locally', () => {
  for (const [name, source] of [['programming.js', studio], ['provider', provider]]) {
    assert.doesNotMatch(source, /\beval\s*\(/, `${name} must not use eval`);
    assert.doesNotMatch(source, /new\s+Function\s*\(/, `${name} must not use new Function`);
    assert.doesNotMatch(source, /child_process/, `${name} must not use child_process`);
    assert.doesNotMatch(source, /require\(['"]vm['"]\)/, `${name} must not use vm`);
  }
});

test('unavailable messaging is localized and the static page stays honest', () => {
  for (const locale of ['en', 'fr', 'hinglish', 'sw', 'ar', 'ha', 'pcm', 'wo']) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'locales', `${locale}.json`), 'utf8'));
    assert.ok(data.programming && data.programming.unavailable, `${locale} needs programming.unavailable`);
  }
  // The static page directs learners to a local runtime and carries the
  // honesty note; the dynamic note rewrite only narrows the sandbox promise.
  assert.match(html, /local language runtime/);
  assert.match(html, /honesty-note/);
});
