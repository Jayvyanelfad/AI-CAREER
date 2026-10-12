const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const REMOVED_PAGES = [
  'career-test-debug.html',
  'debug_career_test.html',
  'simple_debug.html',
  'simple_debug2.html',
  'test_dom.html'
];
const REMOVED_SUPPORT_FILES = [
  'career-test-debug.js',
  'career-test.js.backup',
  'theme - Copy.js'
];
// Built dynamically so this test never itself contains the forbidden marker.
const TEST_TOKEN_MARKER = ['test', 'token', '12345'].join('-');

test('obsolete debug pages and support files are gone from the served directory', () => {
  for (const name of [...REMOVED_PAGES, ...REMOVED_SUPPORT_FILES]) {
    assert.equal(
      fs.existsSync(path.join(PUBLIC_DIR, name)), false,
      `${name} must not exist under public/`
    );
  }
});

test('removed debug pages are not served by the Express static configuration', async t => {
  // Same middleware + directory the real server uses (server.js: express.static("public")).
  const app = express();
  app.use(express.static(PUBLIC_DIR));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  // Positive control: a real page is still served.
  assert.equal((await fetch(`${base}/career-test.html`)).status, 200);

  for (const name of REMOVED_PAGES) {
    const res = await fetch(`${base}/${name}`);
    assert.equal(res.status, 404, `${name} must not be publicly served`);
  }
});

test('server routing defines no explicit route for the removed debug pages', () => {
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  for (const name of REMOVED_PAGES) {
    const stem = name.replace(/\.html$/, '');
    assert.doesNotMatch(serverSource, new RegExp(stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('hardcoded test token is absent from production-served source files', () => {
  const failures = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'locales') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(html|js|css)$/.test(entry.name)) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes(TEST_TOKEN_MARKER)) failures.push(path.relative(PUBLIC_DIR, full));
    }
  };
  walk(PUBLIC_DIR);
  assert.deepEqual(failures, [], `files still containing the hardcoded test token: ${failures.join(', ')}`);
});
