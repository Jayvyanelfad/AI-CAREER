const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('Programming Studio keeps its learning path, RTL code, and responsive layouts', async t => {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 'studio-test-token');
    localStorage.setItem('aicareer-language', 'ar');
    const session = { access_token: 'studio-test-token', user: { id: 'studio-test-user' } };
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null })
    } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/programming.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.programming-track').first().waitFor();
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  assert.equal(await page.locator('.programming-track').count(), 13);
  const trackIds = await page.locator('.programming-track').evaluateAll(tracks => tracks.map(track => track.dataset.trackId));
  assert.equal(new Set(trackIds).size, 13, 'all 13 configured track IDs remain unique');
  assert.equal(await page.locator('.programming-module').count(), 65);
  assert.equal(await page.locator('.programming-lesson').count(), 65);
  assert.equal(await page.locator('.programming-mini-build').count(), 13);
  assert.equal(await page.locator('.programming-project-brief').count(), 13);
  const idAudit = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    return { ids: ids.length, unique: new Set(ids).size };
  });
  assert.equal(idAudit.ids, idAudit.unique, 'rendered IDs should be unique');
  assert.equal(await page.locator('.programming-purpose article').count(), 2);
  assert.equal(await page.locator('.programming-presentation-points li').count(), 11);
  const localizationAudit = await page.evaluate(async () => {
    const keys = [...document.querySelectorAll('[data-i18n], [data-i18n-aria-label]')]
      .flatMap(element => [element.getAttribute('data-i18n'), element.getAttribute('data-i18n-aria-label')])
      .filter(Boolean);
    const missing = [];
    for (const language of ['en', 'fr', 'hinglish', 'sw', 'ar']) {
      const dictionary = await fetch(`locales/${language}.json`).then(response => response.json());
      for (const key of keys) {
        const value = key.split('.').reduce((result, part) => result && result[part], dictionary);
        if (typeof value !== 'string') missing.push(`${language}:${key}`);
      }
    }
    return missing;
  });
  assert.deepEqual(localizationAudit, [], 'all static Programming Studio translation keys exist in every supported locale');

  const python = page.locator('.programming-track[data-track-id="python"]');
  await python.locator(':scope > summary').click();
  assert.equal(await python.locator('.programming-module').count(), 5);
  assert.equal(await python.locator('.programming-lesson').count(), 5);
  assert.equal(await python.locator('.programming-project-brief').count(), 1);
  assert.equal(await python.locator('.programming-project-presentation li').count(), 11);
  assert.equal(await python.locator('.programming-mini-build > p:not(.programming-eyebrow)').innerText(), 'A command-line study session planner that validates a duration and summarizes a plan.');
  const editor = python.locator('[data-practice-editor]').first();
  assert.equal(await editor.evaluate(element => getComputedStyle(element).direction), 'ltr');
  assert.ok((await python.locator('button').filter({ hasText: /Run|Exécuter|Chalao|Endesha|شغّل/i }).count()) > 0,
    'Python practices expose a Run Code control');
  assert.ok((await python.locator('[data-output-panel]').count()) > 0, 'Python practices expose an output panel');
  const practiceNote = await python.locator('.programming-practice-note').first().innerText();
  const expectedPracticeNote = await page.evaluate(() => window.t('coverage.practiceRuntimeNote', ''));
  assert.ok(practiceNote.length > 0, 'Python practices show an execution-environment note');
  assert.equal(practiceNote, expectedPracticeNote, 'practice note follows the localized execution guidance');
  const javaTrack = page.locator('.programming-track[data-track-id="java"]');
  await javaTrack.locator(':scope > summary').click();
  assert.equal(await javaTrack.locator('button').filter({ hasText: /Run|Exécuter|Chalao|Endesha|شغّل/i }).count(), 0,
    'unsupported languages never show a Run Code control');
  assert.ok((await javaTrack.locator('.programming-coming-soon').count()) > 0, 'Java shows a coming soon badge');

  for (const locale of ['en', 'fr', 'hinglish', 'sw', 'ar']) {
    await page.evaluate(async language => {
      await window.setCareerPathLanguage(language);
      window.renderProgrammingStudio();
    }, locale);
    const track = page.locator('.programming-track[data-track-id="python"]');
    await track.locator(':scope > summary').click();
    const objectiveLabel = await track.locator('.programming-objective h5').first().innerText();
    const expectedObjective = await page.evaluate(() => window.t('ui.objective', 'Objective'));
    assert.equal(objectiveLabel, expectedObjective, `lesson labels should follow ${locale}`);
    const miniBuildLabel = (await track.locator('.programming-mini-build .programming-eyebrow').textContent()).trim();
    const expectedMiniBuild = await page.evaluate(() => window.t('coverage.miniBuild', 'Mini-build'));
    assert.equal(miniBuildLabel, expectedMiniBuild, `mini-build label should follow ${locale}`);
    const localizedCompare = await page.locator('.programming-purpose article').nth(1).locator('h2').innerText();
    const expectedCompare = await page.evaluate(() => window.t('coverage.studioDifferenceTitle', 'Build fluency in one language.'));
    assert.equal(localizedCompare, expectedCompare, `Studio comparison should follow ${locale}`);
  }

  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.client + 1, `horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
  }
  await context.close();
});

test('Run executes once per click and shows loading, output, and recovery states', async t => {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

  let runCalls = 0;
  let runBodies = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 'studio-test-token');
    localStorage.setItem('aicareer-language', 'en');
    const session = { access_token: 'studio-test-token', user: { id: 'studio-test-user' } };
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null })
    } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  await context.route('**/api/programming/status', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, available: true, supportedLanguages: ['python', 'javascript'] })
  }));
  let runGateResolve = null;
  const runGate = new Promise(resolve => { runGateResolve = resolve; });
  await context.route('**/api/programming/run', async route => {
    runCalls++;
    try { runBodies.push(route.request().postDataJSON()); } catch { runBodies.push(null); }
    // Hold the first response open until every test click has been
    // dispatched, so slow actionability checks cannot slip past it.
    if (runCalls === 1) await runGate;
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, result: { stdout: 'hello-output', stderr: '', exitCode: 0, durationMs: 12, timedOut: false } })
    });
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/programming.html`, { waitUntil: 'domcontentloaded' });
  const python = page.locator('.programming-track[data-track-id="python"]');
  await python.locator(':scope > summary').click();
  const runButton = python.locator('[data-run-code]').first();
  const editor = python.locator('[data-practice-editor]').first();
  await editor.fill('print("hello-output")');
  // Rapid concurrent clicks must still start exactly one execution: later
  // clicks either fail actionability (disabled) or hit the re-entry guard.
  await Promise.all([
    runButton.click(),
    runButton.click({ timeout: 30000 }).catch(() => {}),
    runButton.click({ timeout: 30000 }).catch(() => {})
  ]);
  runGateResolve();
  await page.locator('[data-output-panel][data-state="success"]').first().waitFor({ timeout: 15000 });
  assert.equal(runCalls, 1, 'exactly one execution request per user run');
  assert.equal(runBodies[0]?.language, 'python');
  assert.equal(typeof runBodies[0]?.code, 'string');
  const panel = python.locator('[data-output-panel]').first();
  assert.match(await panel.locator('[data-output-body]').innerText(), /hello-output/);
  assert.equal(await runButton.isDisabled(), false, 'run control is usable again after completion');
  // Editing and running again issues a second, independent execution.
  await editor.fill('print("second-run")');
  await runButton.click();
  await page.waitForFunction(count => document.querySelectorAll('[data-output-panel][data-state="success"]').length >= 1, undefined, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  assert.ok(runCalls >= 2, 'a second run issues a new execution request');
  await context.close();
});
