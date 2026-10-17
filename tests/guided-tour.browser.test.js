const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const PUBLIC = path.join(__dirname, '..', 'public');
const TOTAL = 6;

/* ------------------------------------------------------------------ *
 * Static guarantees: the tour must never reach the network at all.
 * ------------------------------------------------------------------ */

test('guided tour performs no network requests by construction', () => {
  const source = fs.readFileSync(path.join(PUBLIC, 'tour.js'), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest/);
  assert.doesNotMatch(source, /navigator\.sendBeacon/);
});

test('guided tour links and sample catalog ids are all real', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'course-catalog-config.json'), 'utf8'));
  const script = fs.readFileSync(path.join(PUBLIC, 'tour.js'), 'utf8');
  const page = fs.readFileSync(path.join(PUBLIC, 'tour.html'), 'utf8');

  // Every page the tour can navigate to must exist in public/.
  const targets = new Set();
  for (const match of page.matchAll(/href="([^"#?]+)/g)) targets.add(match[1]);
  for (const match of script.matchAll(/href="([^"#?]+)/g)) targets.add(match[1]);
  for (const match of script.matchAll(/window\.location\.href\s*=\s*'([^']+)'/g)) targets.add(match[1]);
  for (const target of targets) {
    if (/^(?:[a-z]+:)?\/\//i.test(target)) continue; // external asset, not a page
    assert.ok(fs.existsSync(path.join(PUBLIC, target)), `tour links to missing page: ${target}`);
  }

  // Every sample course id must exist in the real catalog, both as a category
  // and inside the career mapping that the real recommendations use.
  const ids = [...script.matchAll(/^\s{4}([a-z_]+):\s*\{\s*nameKey:/gm)].map(match => match[1]);
  assert.ok(ids.length >= 9, `expected the sample catalog map to be declared, got ${ids.length} entries`);
  for (const id of ids) {
    assert.ok(Object.prototype.hasOwnProperty.call(catalog.courseCategories, id), `unknown catalog id: ${id}`);
    assert.ok(
      Object.values(catalog.careerCourseMapping).some(list => list.includes(id)),
      `catalog id missing from careerCourseMapping: ${id}`
    );
  }

  // The course route must be the real one the app reads.
  const detail = fs.readFileSync(path.join(PUBLIC, 'course-detail.js'), 'utf8');
  assert.match(detail, /params\.get\('id'\)/, 'course-detail.html still reads the ?id= parameter');
  assert.match(script, /course-detail\.html\?id=\$\{encodeURIComponent\(courseId\)\}/);
});

/* ------------------------------------------------------------------ *
 * Browser harness
 * ------------------------------------------------------------------ */

async function tourPage(t, options = {}) {
  const {
    width = 1280, height = 900, language = 'en', theme,
    reducedMotion, authenticated = false, collectErrors = true
  } = options;

  const app = express();
  app.use(express.static('public'));
  app.post('/api/ai/chat', (req, res) => res.status(503).json({ error: 'AI unavailable' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => {
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(resolve);
  }));

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());

  const context = await browser.newContext({
    viewport: { width, height },
    ...(reducedMotion ? { reducedMotion } : {})
  });
  await context.addInitScript(([lang, dark, authed]) => {
    if (lang) localStorage.setItem('aicareer-language', lang);
    if (dark) localStorage.setItem('aicareer-theme', dark);
    if (authed) {
      localStorage.setItem('token', 't');
      window.supabase = { auth: {
        getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null }),
        getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
      } };
    }
  }, [language, theme, authenticated]);
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  await context.route('**/fonts.googleapis.com/**', route => route.abort());

  const page = await context.newPage();
  const apiCalls = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) apiCalls.push(`${request.method()} ${request.url()}`);
  });
  if (collectErrors) {
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !/ERR_FAILED|net::ERR/.test(message.text())) consoleErrors.push(message.text());
    });
  }

  await page.goto(`http://127.0.0.1:${server.address().port}/tour.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#tour-stage .tour-step-title').waitFor();
  return { page, context, apiCalls, pageErrors, consoleErrors };
}

const stepLabel = page => page.locator('#tour-step-label');
// Waits for the stage to reach step `target`. The stage publishes its step as a
// data attribute rather than through translated text, so this works in every
// locale (the visible label is localized and cannot be matched on here).
async function gotoStep(page, target) {
  await page.waitForSelector(`#tour-stage[data-step="${target}"]`, { timeout: 15000 });
}
async function clickNext(page, target) {
  await page.locator('#tour-next').click();
  await gotoStep(page, target);
}
async function clickBack(page, target) {
  await page.locator('#tour-back').click();
  await gotoStep(page, target);
}
// Answer the sample assessment. Omitting an index leaves that question blank.
async function answerSample(page, picks = {}) {
  for (const [questionIndex, optionIndex] of Object.entries(picks)) {
    await page.locator(`input[name="tour-sample-q${questionIndex}"][value="${optionIndex}"]`).check();
  }
}
const noOverflow = page => page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

// Shared styles put `transition: all` on anchors, so a theme flip animates the
// link colour. Read it only once the value has stopped changing.
async function stableColor(page, selector) {
  let previous = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const current = await page.locator(selector).first().evaluate(node => getComputedStyle(node).color);
    if (current === previous) return current;
    previous = current;
    await page.waitForTimeout(80);
  }
  return previous;
}

// The site sets `scroll-behavior: smooth` globally, so a plain scrollTo
// animates. Geometry must be read only once the scroll has actually settled.
async function scrollTo(page, where) {
  await page.evaluate(target => window.scrollTo({ top: target, behavior: 'instant' }),
    where === 'bottom' ? 1e6 : 0);
  await page.waitForFunction(target => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.abs(Math.round(window.scrollY) - Math.round(Math.min(max, target))) <= 1;
  }, where === 'bottom' ? 1e6 : 0, { timeout: 5000 });
  await page.waitForTimeout(40);
}

const DIRECTION_NAMES = ['Data Analyst', 'AI/ML Engineer', 'Software Developer', 'UI/UX Designer'];
// Winning paths verified by enumerating every answer combination: each one is
// a strict win, never a tie-break.
const WINNING_PICKS = {
  'Data Analyst': { 0: 0, 1: 1, 2: 0 },
  'AI/ML Engineer': { 0: 0, 1: 0, 2: 0 },
  'Software Developer': { 0: 0, 1: 2, 2: 0 },
  'UI/UX Designer': { 0: 2, 1: 2, 2: 0 }
};

/* ------------------------------------------------------------------ *
 * Existing guarantees
 * ------------------------------------------------------------------ */

test('French tour page logs no missing-translation warnings', async t => {
  const { page } = await tourPage(t, { language: 'fr' });
  const warnings = [];
  page.on('console', message => {
    if (message.type() === 'warning' && message.text().includes('[i18n] missing')) warnings.push(message.text());
  });
  // Trigger a re-render after locale dictionaries have loaded.
  await page.evaluate(() => window.setCareerPathLanguage && window.setCareerPathLanguage('fr'));
  await page.waitForTimeout(2500);
  assert.deepEqual(warnings, [], `unexpected i18n warnings: ${warnings.slice(0, 5).join(' | ')}`);
});

test('tour header never overlaps the page heading', async t => {
  for (const width of [1440, 390]) {
    const { page } = await tourPage(t, { width });
    const overlap = await page.evaluate(() => {
      const header = document.querySelector('header');
      const h1 = document.querySelector('main h1');
      if (!header || !h1) return null;
      const hr = header.getBoundingClientRect();
      const r1 = h1.getBoundingClientRect();
      return r1.top < hr.bottom - 1;
    });
    assert.equal(overlap, false, `header/h1 overlap at ${width}px`);
  }
});

test('guided tour walks six steps with next, back, restart, and exit', async t => {
  const { page, apiCalls } = await tourPage(t);
  assert.match(await stepLabel(page).innerText(), /1 of 6/i);
  assert.match(await page.locator('#tour-stage h2').innerText(), /sample assessment/i);
  for (let step = 2; step <= TOTAL; step++) await clickNext(page, step);
  assert.match(await page.locator('#tour-stage h2').innerText(), /sample certificate/i);
  assert.match(await page.locator('.tour-cert-watermark').innerText(), /sample/i);
  assert.equal(await page.locator('#tour-next').isDisabled(), true);
  await clickBack(page, 5);
  await page.locator('#tour-restart').click();
  await gotoStep(page, 1);
  // The tour page itself must not touch the API at all, in either direction.
  assert.deepEqual(apiCalls, [], 'the tour page makes no API call');
  await page.locator('#tour-exit').click();
  await page.waitForURL('**/index.html', { timeout: 10000 });
  assert.deepEqual(apiCalls.filter(call => !call.startsWith('GET')), [],
    'tour must never write backend data');
});

test('tour practice exam gives feedback and completes without recording', async t => {
  const { page, apiCalls } = await tourPage(t);
  for (let step = 2; step <= 5; step++) await clickNext(page, step);
  // Correct, incorrect and unanswered in one submission.
  await page.locator('input[name="tour-exam-0"][value="0"]').check();
  await page.locator('input[name="tour-exam-1"][value="1"]').check();
  await page.locator('#tour-check').click();
  assert.match(await page.locator('#tour-feedback-0').innerText(), /correct/i);
  assert.equal(await page.locator('#tour-feedback-0').getAttribute('data-state'), 'correct');
  assert.match(await page.locator('#tour-feedback-1').innerText(), /not quite/i);
  assert.equal(await page.locator('#tour-feedback-1').getAttribute('data-state'), 'wrong');
  assert.equal(await page.locator('#tour-feedback-2').getAttribute('data-state'), 'unanswered');
  await page.waitForFunction(() => document.getElementById('tour-exam-done')?.textContent.includes('1 of 3'));
  assert.deepEqual(apiCalls, [], 'practice exam is checked locally only');
});

test('homepage hero tour button opens the guided tour', async t => {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const heroLink = page.locator('.home-hero-actions a[href="tour.html"]');
  assert.equal(await heroLink.count(), 1, 'hero has one prominent tour button');
  await heroLink.click();
  await page.waitForURL('**/tour.html', { timeout: 10000 });
  await page.locator('#tour-stage .tour-step-title').waitFor({ timeout: 15000 });
  await context.close();
});

test('dashboard shortcuts include a guided tour link', async t => {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 't');
    window.supabase = { auth: {
      getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null }),
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const link = page.locator('.dashboard-shortcuts a[href="tour.html"]');
  assert.equal(await link.count(), 1, 'dashboard has one tour link');
  await context.close();
});

test('tour renders mobile and Arabic RTL without overflow', async t => {
  const { page } = await tourPage(t, { width: 390, language: 'ar' });
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'ar');
  assert.ok(await noOverflow(page), 'no horizontal overflow in Arabic mobile layout');
  for (let step = 2; step <= TOTAL; step++) await clickNext(page, step);
  assert.ok(await noOverflow(page), 'no horizontal overflow on the final step');
});

/* ------------------------------------------------------------------ *
 * Redesign guarantees
 * ------------------------------------------------------------------ */

test('every step renders without uncaught JavaScript errors', async t => {
  const { page, pageErrors, consoleErrors } = await tourPage(t);
  const headings = [];
  headings.push(await page.locator('#tour-stage h2').innerText());
  for (let step = 2; step <= TOTAL; step++) {
    await clickNext(page, step);
    headings.push(await page.locator('#tour-stage h2').innerText());
  }
  assert.equal(headings.length, TOTAL);
  headings.forEach((heading, index) => {
    assert.ok(heading.trim().length > 10, `step ${index + 1} has a real heading: ${heading}`);
  });
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
});

test('different sample answers produce different, explainable outcomes', async t => {
  const { page } = await tourPage(t);
  const seen = new Set();
  for (const [direction, picks] of Object.entries(WINNING_PICKS)) {
    await page.locator('#tour-restart').click();
    await gotoStep(page, 1);
    await answerSample(page, picks);
    const title = await page.locator('#tour-result .tour-result-title').innerText();
    assert.ok(title.includes(direction), `expected "${direction}", got "${title}"`);
    seen.add(direction);

    // The result must be explainable: the winning row, the per-direction
    // points, the answers behind it and the tie-break rule are all shown.
    await page.locator('.tour-details > summary').click();
    const winner = await page.locator('#tour-result .tour-score.is-active .tour-score-name').innerText();
    assert.equal(winner, direction, 'the highlighted score row matches the announced direction');
    const rows = await page.locator('#tour-result .tour-score').count();
    assert.equal(rows, DIRECTION_NAMES.length, 'every direction is scored, not just the winner');
    const points = await page.locator('#tour-result .tour-score-value').allInnerTexts();
    assert.ok(points.every(text => /\d/.test(text)), 'each direction shows a numeric score');
    const evidence = await page.locator('#tour-result .tour-evidence li').count();
    assert.equal(evidence, Object.keys(picks).length, 'the answers behind the result are listed');
    const tieBreak = await page.locator('#tour-result .tour-footnote').innerText();
    assert.match(tieBreak, /ties are broken/i, 'the tie-break rule is stated');
  }
  assert.equal(seen.size, DIRECTION_NAMES.length, 'every direction is reachable from the sample questions');
});

test('course recommendations follow the selected sample result', async t => {
  const { page } = await tourPage(t);
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'course-catalog-config.json'), 'utf8'));
  for (const [direction, picks] of Object.entries(WINNING_PICKS)) {
    await page.locator('#tour-restart').click();
    await gotoStep(page, 1);
    await answerSample(page, picks);
    await clickNext(page, 2);

    const context = await page.locator('#tour-stage .tour-context').innerText();
    assert.ok(context.includes(direction), `step 2 names the result it is built from: ${context}`);

    // Recommendations must be a subset of the real mapping for that career.
    const mappingKey = Object.keys(catalog.careerCourseMapping).find(key => key === direction);
    assert.ok(mappingKey, `${direction} exists in the real career mapping`);
    const allowed = new Set(catalog.careerCourseMapping[mappingKey]);
    const linked = await page.locator('#tour-stage .tour-courses a[href^="course-detail.html"]').evaluateAll(
      anchors => anchors.map(anchor => new URL(anchor.href).searchParams.get('id'))
    );
    assert.ok(linked.length >= 3, `${direction} recommends at least three courses, got ${linked.length}`);
    for (const id of linked) {
      assert.ok(allowed.has(id), `${id} must belong to the real ${direction} mapping`);
    }

    // Every real card explains why it fits and links to the real route.
    const realCards = page.locator('#tour-stage .tour-course:not(.is-sample)');
    assert.equal(await realCards.count(), linked.length);
    for (let index = 0; index < linked.length; index++) {
      const card = realCards.nth(index);
      assert.match(await card.locator('.tour-course-why').innerText(), /\S/);
      assert.equal(await card.locator('code').innerText(), linked[index]);
      assert.match(await card.locator('a').getAttribute('href'), /^course-detail\.html\?id=/);
    }

    // The illustrative card is labelled as a sample and carries no dead link.
    const sample = page.locator('#tour-sample-course');
    assert.match(await sample.locator('.tour-sample-badge').innerText(), /sample/i);
    assert.equal(await sample.locator('a').count(), 0, 'a sample card must not link anywhere');
  }
});

test('answers and progress survive back and next navigation', async t => {
  const { page } = await tourPage(t);
  await answerSample(page, { 0: 1, 1: 0, 2: 2 });
  const direction = await page.locator('#tour-result .tour-result-title').innerText();

  // Sample answers persist backwards and forwards.
  await clickNext(page, 2);
  await clickBack(page, 1);
  assert.deepEqual(
    await page.locator('input[name^="tour-sample-q"]:checked').evaluateAll(inputs => inputs.map(input => input.value)),
    ['1', '0', '2'],
    'the chosen answers survive a round trip'
  );
  assert.equal(await page.locator('#tour-result .tour-result-title').innerText(), direction);

  // Enrollment simulation state survives.
  await clickNext(page, 2);
  await clickNext(page, 3);
  await page.locator('#tour-enroll-toggle').click();
  await page.waitForSelector('#tour-enroll-state[data-enrolled="true"]');
  await clickBack(page, 2);
  await clickForwardTo(page, 3);
  assert.equal(await page.locator('#tour-enroll-state').getAttribute('data-enrolled'), 'true',
    'the simulated enrollment is still applied after navigating away and back');

  // Lesson progress survives.
  await clickNext(page, 4);
  await page.locator('input[name="tour-lesson-q"][value="1"]').check();
  await page.locator('#tour-lesson-check').click();
  assert.equal(await page.locator('#tour-lesson-progress').getAttribute('aria-valuenow'), '33');
  await clickBack(page, 3);
  await clickForwardTo(page, 4);
  assert.equal(await page.locator('#tour-lesson-progress').getAttribute('aria-valuenow'), '33',
    'sample lesson progress survives navigating away and back');
  assert.equal(await page.locator('input[name="tour-lesson-q"]:checked').getAttribute('value'), '1',
    'the learner keeps their own lesson answer');

  // Quiz answers survive, and so does the graded result.
  await clickNext(page, 5);
  await page.locator('input[name="tour-exam-0"][value="0"]').check();
  await page.locator('input[name="tour-exam-2"][value="2"]').check();
  await page.locator('#tour-check').click();
  await clickBack(page, 4);
  await clickForwardTo(page, 5);
  assert.deepEqual(
    await page.locator('input[name^="tour-exam-"]:checked').evaluateAll(inputs => inputs.map(input => input.name + '=' + input.value)),
    ['tour-exam-0=0', 'tour-exam-2=2'],
    'quiz answers survive a round trip'
  );
  assert.match(await page.locator('#tour-exam-done').innerText(), /2 of 3/, 'the graded summary is still shown');
});

async function clickForwardTo(page, target) {
  while (true) {
    const current = Number((await stepLabel(page).innerText()).match(/(\d)\s+of/i)[1]);
    if (current === target) return;
    await clickNext(page, current + 1);
  }
}

test('enrollment simulation changes local state only', async t => {
  const { page, apiCalls } = await tourPage(t, { authenticated: true });
  await clickNext(page, 2);
  await clickNext(page, 3);
  assert.equal(await page.locator('#tour-enroll-state').getAttribute('data-enrolled'), 'false');
  assert.match(await page.locator('#tour-stage .tour-sample-badge').first().innerText(), /sample/i);

  await page.locator('#tour-enroll-toggle').click();
  await page.waitForSelector('#tour-enroll-state[data-enrolled="true"]');
  assert.match(await page.locator('#tour-enroll-state .tour-state-title').innerText(), /demo only|sample/i);
  assert.match(await page.locator('#tour-enroll-state .tour-state-detail').innerText(), /nothing was sent/i);

  // The documented unlocks match the real server behaviour.
  const unlocks = await page.locator('#tour-stage .tour-list li').allInnerTexts();
  assert.equal(unlocks.length, 4);
  assert.ok(unlocks.every(text => text.trim().length > 20), 'each unlock is explained');

  // Toggling back proves it is reversible and local.
  await page.locator('#tour-enroll-toggle').click();
  await page.waitForSelector('#tour-enroll-state[data-enrolled="false"]');

  assert.deepEqual(apiCalls.filter(call => !call.includes('/api/ai/chat')), [],
    'the enrollment simulation must not call an enrollment API');
});

test('sample lesson challenge gives feedback and updates progress', async t => {
  const { page } = await tourPage(t);
  for (let step = 2; step <= 4; step++) await clickNext(page, step);
  const progress = () => page.locator('#tour-lesson-progress').getAttribute('aria-valuenow');
  assert.equal(await progress(), '0');

  // A wrong answer is acknowledged, explains nothing, and awards no progress.
  await page.locator('input[name="tour-lesson-q"][value="0"]').check();
  await page.locator('#tour-lesson-check').click();
  assert.equal(await page.locator('#tour-lesson-feedback').getAttribute('data-state'), 'wrong');
  assert.match(await page.locator('#tour-lesson-feedback').innerText(), /not quite/i);
  assert.equal(await progress(), '0', 'a wrong answer must not award progress');

  // Changing the selection clears the stale verdict.
  await page.locator('input[name="tour-lesson-q"][value="1"]').check();
  assert.equal(await page.locator('#tour-lesson-feedback').count(), 0, 'stale feedback is dropped on a new choice');

  await page.locator('#tour-lesson-check').click();
  assert.equal(await page.locator('#tour-lesson-feedback').getAttribute('data-state'), 'correct');
  assert.match(await page.locator('#tour-lesson-feedback').innerText(), /training/i, 'the correct answer is explained');
  assert.equal(await progress(), '33', 'one of three sample lessons complete');
  assert.match(await page.locator('.tour-progress-text').innerText(), /1 of 3/);
  assert.equal(await page.locator('#tour-lesson-check').count(), 0, 'a solved sample lesson is not re-checkable');
  assert.match(await page.locator('.tour-done').innerText(), /nothing was saved/i);
});

test('quiz scores correctly, separates unanswered from wrong, and re-grades on retry', async t => {
  const { page } = await tourPage(t);
  for (let step = 2; step <= 5; step++) await clickNext(page, step);

  // All three correct.
  await page.locator('input[name="tour-exam-0"][value="0"]').check();
  await page.locator('input[name="tour-exam-1"][value="0"]').check();
  await page.locator('input[name="tour-exam-2"][value="2"]').check();
  await page.locator('#tour-check').click();
  assert.match(await page.locator('#tour-exam-done').innerText(), /3 of 3/);
  assert.match(await page.locator('#tour-exam-done').innerText(), /3 correct . 0 incorrect . 0 unanswered/);

  // Editing an answer after submitting updates the score and feedback at once.
  await page.locator('input[name="tour-exam-2"][value="0"]').check();
  assert.match(await page.locator('#tour-exam-done').innerText(), /2 of 3/);
  assert.match(await page.locator('#tour-exam-done').innerText(), /2 correct . 1 incorrect . 0 unanswered/);
  assert.equal(await page.locator('#tour-feedback-2').getAttribute('data-state'), 'wrong');

  // Retry keeps the answers and lets the learner finish the quiz.
  await page.locator('#tour-quiz-retry').click();
  assert.equal(await page.locator('#tour-check').count(), 1, 'retry returns the submit action');
  assert.equal(await page.locator('#tour-exam-done').count(), 0, 'retry clears the stale score');
  assert.deepEqual(
    await page.locator('input[name^="tour-exam-"]:checked').evaluateAll(inputs => inputs.map(input => input.name + '=' + input.value)),
    ['tour-exam-0=0', 'tour-exam-1=0', 'tour-exam-2=0'],
    'retry keeps the current answers so they can be adjusted'
  );
  await page.locator('input[name="tour-exam-2"][value="2"]').check();
  await page.locator('#tour-check').click();
  assert.match(await page.locator('#tour-exam-done').innerText(), /3 of 3/, 'the latest answers decide the score');

  // An untouched question is reported as unanswered, never as incorrect.
  await page.locator('#tour-restart').click();
  await gotoStep(page, 1);
  for (let step = 2; step <= 5; step++) await clickNext(page, step);
  await page.locator('input[name="tour-exam-0"][value="0"]').check();
  await page.locator('#tour-check').click();
  assert.match(await page.locator('#tour-exam-done').innerText(), /1 correct . 0 incorrect . 2 unanswered/);
  assert.equal(await page.locator('#tour-feedback-1').getAttribute('data-state'), 'unanswered');
  assert.match(await page.locator('#tour-feedback-1').innerText(), /not answered/i);
  assert.match(await page.locator('#tour-stage .tour-disclaimer').innerText(), /not a real exam attempt/i);
});

test('certificate preview stays an explicit demo and states real eligibility', async t => {
  const { page } = await tourPage(t);
  await answerSample(page, WINNING_PICKS['Data Analyst']);
  for (let step = 2; step <= TOTAL; step++) await clickNext(page, step);

  const certificate = page.locator('#tour-certificate');
  assert.match(await certificate.locator('.tour-cert-watermark').innerText(), /sample/i);
  assert.match(await certificate.locator('.tour-cert-kicker').innerText(), /sample/i);
  assert.match(await certificate.innerText(), /sample learner/i);
  assert.match(await certificate.innerText(), /certificate id:\s*none/i, 'no certificate id is implied');
  assert.match(await certificate.locator('.tour-cert-for').innerText(), /Data Analytics Basics/,
    'the preview follows the sample result');

  // The eligibility list must mirror the real server rules, including the ones
  // the previous tour wrongly omitted.
  const rules = await page.locator('#tour-stage .tour-eligibility li').allInnerTexts();
  assert.equal(rules.length, 6);
  assert.ok(rules[0].match(/enrolled/i));
  assert.ok(rules[1].match(/every lesson/i));
  assert.ok(rules[2].match(/exactly one.*final exam/i));
  assert.ok(rules[3].match(/latest.*passed/i), 'the latest-attempt rule is stated');
  assert.ok(rules[4].match(/name/i), 'the profile-name rule is stated');
  assert.ok(rules[5].match(/server/i), 'the server-only rule is stated');

  const summary = await page.locator('#tour-summary').innerText();
  assert.match(summary, /Sample direction:\s*Data Analyst/);
  assert.match(await page.locator('#tour-stage').innerText(), /created no certificate, no enrollment/i);
});

test('restart clears the intended tour state and exit returns home', async t => {
  const { page, apiCalls } = await tourPage(t);
  await answerSample(page, { 0: 0, 1: 0, 2: 0 });
  await clickNext(page, 2);
  await clickNext(page, 3);
  await page.locator('#tour-enroll-toggle').click();
  await clickNext(page, 4);
  await page.locator('input[name="tour-lesson-q"][value="1"]').check();
  await page.locator('#tour-lesson-check').click();
  await clickNext(page, 5);
  await page.locator('input[name="tour-exam-0"][value="0"]').check();
  await page.locator('#tour-check').click();

  await page.locator('#tour-restart').click();
  await gotoStep(page, 1);
  assert.equal(await page.locator('input[name^="tour-sample-q"]:checked').count(), 0, 'answers are cleared');
  assert.equal(await page.locator('#tour-result').count(), 0, 'the sample result is cleared');
  assert.equal(await page.locator('#tour-back').isDisabled(), true, 'Back is disabled again at the first step');

  await clickNext(page, 2);
  await clickNext(page, 3);
  assert.equal(await page.locator('#tour-enroll-state').getAttribute('data-enrolled'), 'false', 'the simulated enrollment resets');
  await clickNext(page, 4);
  assert.equal(await page.locator('#tour-lesson-progress').getAttribute('aria-valuenow'), '0', 'lesson progress resets');
  await clickNext(page, 5);
  assert.equal(await page.locator('#tour-exam-done').count(), 0, 'the quiz result resets');
  assert.equal(await page.locator('input[name^="tour-exam-"]:checked').count(), 0, 'quiz answers reset');

  // Boundary navigation is explained rather than silently dead.
  await clickNext(page, TOTAL);
  assert.equal(await page.locator('#tour-next').isDisabled(), true);
  assert.match(await page.locator('#tour-nav-hint').innerText(), /last step/i);
  assert.match(await page.locator('#tour-next').getAttribute('title'), /last step/i);

  await page.locator('#tour-restart-final').click();
  await gotoStep(page, 1);
  assert.match(await page.locator('#tour-nav-hint').innerText(), /first step/i);

  await page.locator('#tour-exit').click();
  await page.waitForURL('**/index.html', { timeout: 10000 });
  assert.deepEqual(apiCalls.filter(call => !call.startsWith('GET')), [],
    'no tour action produced an API write');
});

test('the tour makes no API call and records no learner data', async t => {
  const { page, apiCalls } = await tourPage(t, { authenticated: true });
  // Exercise every interactive step while signed in, so any accidental write
  // would be attributed to the tour.
  await answerSample(page, { 0: 0, 1: 2, 2: 0 });
  await clickNext(page, 2);
  await clickNext(page, 3);
  await page.locator('#tour-enroll-toggle').click();
  await clickNext(page, 4);
  await page.locator('input[name="tour-lesson-q"][value="1"]').check();
  await page.locator('#tour-lesson-check').click();
  await clickNext(page, 5);
  for (const index of [0, 1, 2]) await page.locator(`input[name="tour-exam-${index}"][value="0"]`).check();
  await page.locator('#tour-check').click();
  await clickNext(page, 6);

  const writes = apiCalls.filter(call => !call.startsWith('GET') && !call.includes('/api/ai/chat'));
  assert.deepEqual(writes, [], `the tour must never write, saw: ${writes.join(' | ')}`);

  // Nothing may be persisted to storage either.
  const stored = await page.evaluate(() => ({
    keys: Object.keys(localStorage).filter(key => !['aicareer-language', 'aicareer-theme', 'token'].includes(key)),
    session: Object.keys(sessionStorage)
  }));
  assert.deepEqual(stored, { keys: [], session: [] }, 'the tour keeps its demo state in memory only');
});

test('the tour page has no console errors, translation warnings or broken links', async t => {
  const { page, consoleErrors, apiCalls } = await tourPage(t, { language: 'fr' });
  const warnings = [];
  page.on('console', message => {
    if (message.type() === 'warning' && message.text().includes('[i18n] missing')) warnings.push(message.text());
  });
  await answerSample(page, { 0: 0, 1: 0, 2: 0 });
  for (let step = 2; step <= TOTAL; step++) await clickNext(page, step);
  await page.locator('#tour-restart-final').click();
  await gotoStep(page, 1);

  assert.deepEqual(warnings, [], `unexpected i18n warnings: ${warnings.slice(0, 5).join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);

  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('#tour-shell a[href]')].map(anchor => anchor.getAttribute('href')));
  assert.ok(hrefs.length > 0, 'the tour offers real next steps');
  for (const href of hrefs) {
    if (/^(?:[a-z]+:)?\/\//i.test(href)) continue;
    const [file] = href.split('?');
    assert.ok(fs.existsSync(path.join(PUBLIC, file)), `tour links to a missing page: ${href}`);
  }
  assert.ok(await noOverflow(page));
  assert.deepEqual(apiCalls.filter(call => !call.startsWith('GET') && !call.includes('/api/ai/chat')), []);
});

test('step navigation is keyboard operable with visible focus and labels', async t => {
  const { page } = await tourPage(t);
  // Accessible naming for the chrome.
  const bar = page.locator('#tour-progress');
  assert.equal(await bar.getAttribute('role'), 'progressbar');
  assert.equal(await bar.getAttribute('aria-valuemin'), '0');
  assert.equal(await bar.getAttribute('aria-valuemax'), '100');
  assert.ok((await bar.getAttribute('aria-valuetext')).includes('Step 1 of 6'));
  assert.ok((await bar.getAttribute('aria-label')).length > 3, 'the progressbar is labelled');
  assert.equal(await page.locator('.tour-rail-item[aria-current="step"]').count(), 1, 'exactly one step is current');
  assert.match(await page.locator('.tour-rail-item[aria-current="step"] .tour-rail-name').innerText(), /Discover interests/);

  // Every control has an accessible name and a comfortable tap target.
  for (const id of ['#tour-back', '#tour-next', '#tour-restart', '#tour-exit']) {
    const box = await page.locator(id).boundingBox();
    assert.ok(box.height >= 44, `${id} is at least 44px tall (${box && box.height})`);
    assert.ok((await page.locator(id).innerText()).trim().length > 1, `${id} has a text label`);
  }

  // Radio groups are real fieldsets with legends.
  assert.equal(await page.locator('#tour-stage fieldset').count(), 3);
  assert.equal(await page.locator('#tour-stage fieldset legend').count(), 3);

  // Keyboard: focus advances to the step heading, and arrow keys move within a
  // radio group while keeping a visible focus indicator.
  await page.locator('#tour-next').focus();
  await page.keyboard.press('Enter');
  await gotoStep(page, 2);
  assert.equal(await page.evaluate(() => document.activeElement?.className), 'tour-step-title',
    'a step change moves focus to the new heading');
  await clickBack(page, 1);

  // Establish keyboard modality first: Chromium only applies :focus-visible to a
// programmatic focus() when the last interaction was a key press.
  await page.keyboard.press('Tab');
  await page.locator('input[name="tour-sample-q0"][value="0"]').focus();
  assert.ok(await page.evaluate(() => document.activeElement.matches(':focus-visible')),
    'keyboard focus is visible to the browser as :focus-visible');
  assert.notEqual(await page.locator('input[name="tour-sample-q0"][value="0"]')
    .evaluate(node => getComputedStyle(node).outlineStyle), 'none',
  'the focused control has a visible outline');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.value), '1',
    'arrow keys move the sample answer selection');
  assert.equal(await page.evaluate(() => document.activeElement.name), 'tour-sample-q0',
    'focus stays on the radio group the keyboard is driving');
  assert.equal(await page.locator('#tour-result').count(), 0,
    'a partially answered sample shows no result yet');
  // Finish the sequence from the keyboard; the result must appear.
  await page.locator('input[name="tour-sample-q1"][value="0"]').focus();
  await page.keyboard.press('Space');
  await page.locator('input[name="tour-sample-q2"][value="0"]').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#tour-result').count(), 1, 'a keyboard-driven answer updates the result');
  assert.match(await page.locator('#tour-result .tour-result-title').innerText(), /AI\/ML Engineer/);
});

test('reduced motion disables the tour animations', async t => {
  const { page } = await tourPage(t, { reducedMotion: 'reduce' });
  await clickNext(page, 2);
  const animation = await page.locator('#tour-stage > *').first().evaluate(node => getComputedStyle(node).animationName);
  assert.equal(animation, 'none', 'step transitions are disabled for reduced motion');

  const withMotion = await tourPage(t, { reducedMotion: 'no-preference' });
  const animated = await withMotion.page.locator('#tour-stage > *').first()
    .evaluate(node => getComputedStyle(node).animationName);
  assert.notEqual(animated, 'none', 'the default tour does animate');
});

test('chatbot, theme and language selection keep working on the tour page', async t => {
  const { page } = await tourPage(t, { authenticated: true });
  await page.waitForSelector('#chatbot-window', { state: 'attached', timeout: 15000 });
  assert.equal(await page.locator('[data-chatbot-open]').count(), 1, 'one chatbot launcher');
  await page.locator('[data-chatbot-open]').click();
  await page.waitForSelector('#chatbot-window', { state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#chatbot-window').getAttribute('role'), 'dialog');
  // The launcher must not cover the tour's own controls.
  const overlap = await page.evaluate(() => {
    const launcher = document.querySelector('[data-chatbot-open]').getBoundingClientRect();
    return [...document.querySelectorAll('.tour-controls button')].some(button => {
      const rect = button.getBoundingClientRect();
      return !(rect.right < launcher.left || rect.left > launcher.right || rect.bottom < launcher.top || rect.top > launcher.bottom);
    });
  });
  assert.equal(overlap, false, 'the chatbot launcher never sits on top of the tour controls');

  // Theme toggle from the shared theme controller.
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('.theme-toggle').click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  assert.notEqual(before, after, 'the shared theme toggle still switches theme');
  assert.equal(await page.locator('#tour-stage .tour-step-title').count(), 1, 'the tour survives a theme switch');

  // Header links must stay readable in whichever theme is now active. The shared
  // stylesheet paints them near-white for photographic heroes, which vanishes on
  // the tour's flat light surface, so this is a direct regression guard.
  const linkColor = await stableColor(page, 'header nav a');
  const headerLink = await page.evaluate(color => {
    const link = document.querySelector('header nav a');
    const parse = value => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    let backdrop = 'rgb(255, 255, 255)';
    for (let node = link; node; node = node.parentElement) {
      const value = getComputedStyle(node).backgroundColor;
      if (value && !/rgba\(0, 0, 0, 0\)|transparent/.test(value)) { backdrop = value; break; }
    }
    const [r1, g1, b1] = parse(color);
    const [r2, g2, b2] = parse(backdrop);
    return {
      theme: document.documentElement.dataset.theme,
      color,
      backdrop,
      distance: Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
    };
  }, linkColor);
  assert.ok(headerLink.distance > 120,
    `header links stay legible in the ${headerLink.theme} theme (${headerLink.color} on ${headerLink.backdrop})`);

  // Body copy: compare text against its resolved backdrop, but only where the
  // backdrop is a plain rgb() value the checker can parse correctly.
  const lowContrast = await page.evaluate(() => {
    const parse = value => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const luminance = value => {
      const [r, g, b] = parse(value).map(channel => {
        const v = channel / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const backdropOf = node => {
      for (let current = node; current; current = current.parentElement) {
        const value = getComputedStyle(current).backgroundColor;
        if (value && !/rgba\(0, 0, 0, 0\)|transparent/.test(value)) return value;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return [...document.querySelectorAll('#tour-shell h2, #tour-shell h3, #tour-shell h4, #tour-shell p, #tour-shell li')]
      .filter(node => node.offsetWidth > 0 && node.offsetHeight > 0)
      .map(node => {
        const backdrop = backdropOf(node);
        // color-mix() resolves to color(srgb …), which this checker cannot parse.
        if (/color\(/.test(backdrop) || /color\(/.test(getComputedStyle(node).color)) return null;
        const a = luminance(getComputedStyle(node).color);
        const b = luminance(backdrop);
        const [light, dark] = a > b ? [a, b] : [b, a];
        return { ratio: Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100, text: node.textContent.trim().slice(0, 32) };
      })
      .filter(entry => entry && entry.ratio < 4.5);
  });
  assert.deepEqual(lowContrast, [],
    `tour copy keeps a 4.5:1 contrast ratio in the ${headerLink.theme} theme`);

  // Language selector from the shared i18n controller.
  const selector = page.locator('select[data-language-preference]');
  assert.ok(await selector.count() >= 1, 'the tour offers a language selector');
  const options = await selector.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
  for (const code of ['en', 'fr', 'hinglish', 'sw', 'ar', 'pcm']) {
    assert.ok(options.includes(code), `language selector offers ${code}`);
  }
  await selector.selectOption('sw');
  await page.waitForFunction(() => document.documentElement.lang === 'sw', null, { timeout: 15000 });
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'ltr');
  // Swahili copy is applied and the answer the visitor gave is preserved.
  assert.match(await page.locator('#tour-stage .tour-step-title').innerText(), /\S/);
  await answerSample(page, WINNING_PICKS['Data Analyst']);
  await page.locator('.tour-details > summary').click();
  assert.equal(await page.locator('#tour-result .tour-score.is-active .tour-score-name').innerText(), 'Mchambuzi wa Data',
    'the winning direction is translated');

  await selector.selectOption('ar');
  await page.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 15000 });
  assert.ok(await noOverflow(page), 'switching to Arabic keeps the tour free of horizontal overflow');
  await page.locator('.tour-details > summary').click();
  assert.equal(await page.locator('#tour-result .tour-score.is-active .tour-score-name').innerText(), 'محلل بيانات',
    'the chosen direction survives a language switch');
  assert.equal(await page.locator(`input[name="tour-sample-q0"][value="${WINNING_PICKS['Data Analyst'][0]}"]`).isChecked(), true,
    'the visitor answers survive a language switch');
});

test('the tour keeps its layout from tablet down to small mobile', async t => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const { page } = await tourPage(t, { width, height: 900 });
    assert.ok(await noOverflow(page), `no horizontal overflow at ${width}px`);
    await answerSample(page, { 0: 0, 1: 0, 2: 0 });
    assert.ok(await noOverflow(page), `no horizontal overflow with a result at ${width}px`);
    for (let step = 2; step <= TOTAL; step++) {
      await clickNext(page, step);
      assert.ok(await noOverflow(page), `no horizontal overflow at ${width}px on step ${step}`);
    }
    // Content must never hide under the absolutely positioned site header.
    const overlap = await page.evaluate(() => {
      const header = document.querySelector('header').getBoundingClientRect();
      return [...document.querySelectorAll('.tour-hero > *, .tour-rail, .tour-stepper')]
        .some(node => node.getBoundingClientRect().top < header.bottom - 1);
    });
    assert.equal(overlap, false, `no header overlap at ${width}px`);

    // The shared stylesheet hides `header nav` on small screens, so the language
    // selector and theme toggle must stay reachable there too.
    if (width <= 620) {
      for (const selector of ['select[data-language-preference]', '.theme-toggle']) {
        assert.ok(await page.locator(selector).first().isVisible(),
          `${selector} stays visible at ${width}px`);
      }
    }
  }
});

test('the chatbot launcher never covers the tour controls', async t => {
  for (const width of [1440, 390]) {
    const { page } = await tourPage(t, { width, height: 844, authenticated: true });
    await page.waitForSelector('[data-chatbot-open]', { state: 'visible', timeout: 15000 });
    for (let step = 1; step <= TOTAL; step++) {
      if (step > 1) {
        await page.locator('#tour-next').click();
        await gotoStep(page, step);
      }
      // Check both at rest and fully scrolled, where a fixed launcher sits
      // closest to the bottom of the document. A viewport-fixed widget will
      // always float over page content somewhere mid-scroll, so the guarantee
      // asserted here is that no control is covered in its lowest settled
      // position, and that every control can be scrolled clear of the
      // launcher — i.e. no control is ever permanently unreachable.
      const positions = [0, 'bottom'];
      const coverage = [];
      for (const scroll of positions) {
        await scrollTo(page, scroll);
        coverage.push(await page.evaluate(() => {
          const launcher = document.querySelector('[data-chatbot-open]').getBoundingClientRect();
          const covered = {};
          document.querySelectorAll('.tour-controls button, .tour-next-actions .tour-button').forEach(button => {
            const rect = button.getBoundingClientRect();
            if (rect.width === 0) return;
            const hidden = !(rect.right < launcher.left || rect.left > launcher.right
              || rect.bottom < launcher.top || rect.top > launcher.bottom);
            const key = button.id || button.textContent.trim();
            covered[key] = covered[key] || hidden;
          });
          return covered;
        }));
      }
      const settled = coverage[positions.length - 1];
      for (const [name, hidden] of Object.entries(settled)) {
        assert.equal(hidden, false,
          `the launcher must not cover "${name}" at its lowest position (${width}px, step ${step})`);
      }
      const reachable = coverage.some(position => Object.values(position).some(hidden => !hidden));
      assert.ok(reachable, `the tour controls can be scrolled clear of the launcher at ${width}px`);
    }
  }
});