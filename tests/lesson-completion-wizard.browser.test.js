// Regression coverage for completing a lesson that renders the staged learning
// experience.
//
// "What is Artificial Intelligence?" in Introduction to AI & ML is the only
// lesson that renders the six-stage walkthrough, and the generic lesson-actions
// "Mark as Complete" button used to be hidden outright for it. That left the
// wizard's final-stage button as the *only* reachable completion control, so the
// lesson could not be completed by the normal interface. Because
// checkExamEligibility() requires every lesson, one un-completable lesson also
// locked the final exam and the certificate for the whole course.
//
// These tests drive the real page and assert a usable completion control exists
// at every stage, that it reaches the real endpoint, and that the server
// remains the authority on the 26/26 count.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const courseContent = require('../intro-to-ai-course-content');

const COURSE_ID = 'intro_to_ai';
const COURSE_TITLE = courseContent.title;

const modules = courseContent.modules.map((module, index) => ({
  id: `module-${index + 1}-0000-4000-8000-000000000000`,
  course_id: COURSE_ID,
  title: module.title,
  description: module.description,
  order: index + 1
}));

const lessons = [];
modules.forEach((module, moduleIndex) => {
  courseContent.modules[moduleIndex].lessons.forEach((lesson, lessonIndex) => {
    lessons.push({
      id: `00000000-0000-4000-8000-${String(moduleIndex * 100 + lessonIndex + 1).padStart(12, '0')}`,
      module_id: module.id,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      duration_minutes: lesson.duration_minutes,
      lesson_order: lessonIndex + 1,
      order: lessonIndex + 1
    });
  });
});

const GATED_LESSON = lessons.find(lesson => lesson.title.toLowerCase() === 'what is artificial intelligence?');
const PLAIN_LESSON = lessons[1];

async function fixture(t, { completed }) {
  const app = express();
  app.use(express.static('public'));

  const completedIds = new Set(completed.map(lesson => lesson.id));
  const completeCalls = [];

  app.get('/api/courses/:id', (_req, res) => res.json({
    id: COURSE_ID, title: COURSE_TITLE, description: 'An introductory course.',
    category: 'AI & Machine Learning', level: 'beginner', status: 'available', image_url: ''
  }));
  app.get('/api/courses/:id/modules', (_req, res) => res.json({ modules }));
  app.get('/api/modules/:id/lessons', (req, res) =>
    res.json({ lessons: lessons.filter(lesson => lesson.module_id === req.params.id) }));
  app.get('/api/courses/:id/progress/lessons', (_req, res) => res.json({
    completedLessons: [...completedIds],
    completedCount: completedIds.size,
    totalLessons: lessons.length,
    progress: Math.round((completedIds.size / lessons.length) * 100)
  }));
  app.get('/api/exams', (_req, res) => res.json({ exams: [] }));
  app.get('/api/enrollments/:id', (_req, res) => res.json({ id: 'enr-1', course_id: COURSE_ID, course_name: COURSE_TITLE, progress: 96 }));
  app.post('/api/lessons/:lessonId/complete', (req, res) => {
    completeCalls.push(req.params.lessonId);
    completedIds.add(req.params.lessonId);
    res.json({
      lessonId: req.params.lessonId,
      completed: true,
      completedLessons: completedIds.size,
      totalLessons: lessons.length,
      progress: Math.round((completedIds.size / lessons.length) * 100),
      completedLessonIds: [...completedIds]
    });
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  return { base: `http://127.0.0.1:${server.address().port}`, completeCalls };
}

async function learnerPage(t, browser, base, sessionSeed = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  t.after(async () => { await context.close().catch(() => {}); });
  await context.addInitScript(seed => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('aicareer-language', 'en');
    for (const [key, value] of Object.entries(seed)) sessionStorage.setItem(key, value);
    const session = { access_token: 'test-token', user: { id: 'user-1', email: 'learner@example.test' } };
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
    window.getAuthAccessToken = async () => 'test-token';
  }, sessionSeed);
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message.split('\n')[0]));
  await page.goto(`${base}/course-detail.html?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  return { page, errors };
}

// Which completion controls a learner can actually press right now?
const controlState = () => {
  const wizard = document.querySelector('#lxp-complete');
  const bar = document.getElementById('btn-mark-complete');
  const visible = el => !!el && getComputedStyle(el).display !== 'none' && !el.hidden;
  const usable = el => visible(el) && !el.disabled;
  return {
    wizardUsable: usable(wizard),
    barUsable: usable(bar),
    anyUsable: usable(wizard) || usable(bar),
    stage: document.querySelector('#lxp-counter')?.textContent?.trim() || null
  };
};

test('the gated lesson always offers a working completion control', async t => {
  const everythingElse = lessons.filter(lesson => lesson.id !== GATED_LESSON.id);
  const { base, completeCalls } = await fixture(t, { completed: everythingElse });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close().catch(() => {}); });
  const { page, errors } = await learnerPage(t, browser, base);

  // The Continue button must route the learner to the outstanding lesson.
  // The label is uppercased by CSS, so innerText is compared case-insensitively.
  const continueLabel = await page.locator('#btn-continue-outstanding').innerText();
  assert.match(continueLabel, /what is artificial intelligence\?/i);
  await page.click('#btn-continue-outstanding');
  await page.waitForTimeout(800);

  assert.equal(await page.locator('#lxp-root').count(), 1, 'the gated lesson renders the walkthrough');

  // Walk every stage the way a learner would and keep answering the challenge
  // until the walkthrough lets us continue.
  for (let guard = 0; guard < 12; guard++) {
    const state = await page.evaluate(controlState);
    assert.ok(state.anyUsable, `no usable completion control on ${state.stage}: ${JSON.stringify(state)}`);
    if (state.wizardUsable) break;

    if (await page.evaluate(() => document.querySelector('#lxp-next')?.disabled)) {
      const answered = await page.evaluate(() => {
        let count = 0;
        document.querySelectorAll('.lxp-scenario').forEach(scenario => {
          if (scenario.querySelector('.lxp-scenario-feedback:not([hidden])')) return;
          scenario.querySelector('.lxp-choice').click();
          count++;
        });
        return count;
      });
      assert.ok(answered > 0, 'a blocked challenge stage always has an unanswered scenario to click');
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.querySelector('#lxp-next')?.disabled), false,
        'answering every challenge scenario must release the Continue button');
    }
    await page.click('#lxp-next');
    await page.waitForTimeout(150);
  }

  const final = await page.evaluate(controlState);
  assert.ok(final.anyUsable, `the final stage must expose a completion control: ${JSON.stringify(final)}`);

  await page.click('#lxp-complete');
  await page.waitForTimeout(900);

  assert.deepEqual(completeCalls, [GATED_LESSON.id], 'completion reaches the real lesson-complete endpoint');
  assert.deepEqual(errors, [], 'completing the lesson produced no page errors');
});

test('the lesson is completable before the walkthrough is finished', async t => {
  // This is the regression: the generic button used to be display:none for this
  // one lesson, leaving no reachable control at all on the early stages.
  const { base, completeCalls } = await fixture(t, { completed: lessons.filter(l => l.id !== GATED_LESSON.id) });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close().catch(() => {}); });
  const { page } = await learnerPage(t, browser, base);

  await page.click('#btn-continue-outstanding');
  await page.waitForTimeout(800);

  const firstStage = await page.evaluate(controlState);
  assert.equal(firstStage.stage, 'Stage 1 of 6');
  assert.equal(firstStage.wizardUsable, false, 'the walkthrough has not reached its final stage yet');
  assert.equal(firstStage.barUsable, true,
    'the standard Mark as Complete control must stay available so this lesson can never be stranded');

  await page.click('#btn-mark-complete');
  await page.waitForTimeout(900);
  assert.deepEqual(completeCalls, [GATED_LESSON.id]);
});

test('progress only reaches 26/26 when every lesson is actually completed', async t => {
  const { base, completeCalls } = await fixture(t, { completed: lessons.slice(1) });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close().catch(() => {}); });
  const { page } = await learnerPage(t, browser, base);

  const before = await page.evaluate(() => ({
    percent: document.getElementById('progress-percent')?.textContent?.trim(),
    label: document.getElementById('course-progress')?.textContent?.trim()
  }));
  assert.equal(before.percent, '96%', '25 of 26 lessons is 96% - not 100%');

  await page.click('#btn-continue-outstanding');
  await page.waitForTimeout(800);
  await page.click('#btn-mark-complete');
  await page.waitForTimeout(1000);

  const after = await page.evaluate(() => {
    const continueButton = document.getElementById('btn-continue-outstanding');
    return {
      percent: document.getElementById('progress-percent')?.textContent?.trim(),
      continueVisible: !!continueButton && getComputedStyle(continueButton).display !== 'none' && !continueButton.hidden
    };
  });
  assert.equal(completeCalls.length, 1);
  assert.equal(after.percent, '100%', 'the last completed lesson takes the course to 100%');
  assert.equal(after.continueVisible, false, 'no outstanding lesson remains once every lesson is complete');
});

test('an unenrolled learner still cannot complete any lesson', async t => {
  const app = express();
  app.use(express.static('public'));
  app.get('/api/courses/:id', (_req, res) => res.json({ id: COURSE_ID, title: COURSE_TITLE, description: '', category: 'AI', level: 'beginner', status: 'available', image_url: '' }));
  app.get('/api/courses/:id/modules', (_req, res) => res.json({ modules }));
  app.get('/api/modules/:id/lessons', (req, res) => res.json({ lessons: lessons.filter(l => l.module_id === req.params.id) }));
  app.get('/api/courses/:id/progress/lessons', (_req, res) => res.json({ completedLessons: [], completedCount: 0, totalLessons: lessons.length, progress: 0 }));
  app.get('/api/exams', (_req, res) => res.json({ exams: [] }));
  // Matches course-enrollment-api.js exactly: not enrolled is a 404 NOT_ENROLLED.
  app.get('/api/enrollments/:id', (_req, res) => res.status(404).json({ error: 'NOT_ENROLLED' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close().catch(() => {}); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const { page } = await learnerPage(t, browser, base);

  // Open the plain lesson, which does not use the walkthrough at all.
  await page.locator(`.lesson-item[data-lesson-id="${PLAIN_LESSON.id}"]`).click();
  await page.waitForSelector('#lesson-content .lesson-content-title', { timeout: 15000 });
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const bar = document.getElementById('btn-mark-complete');
    return { disabled: bar?.disabled, title: bar?.title, shownTitle: document.querySelector('#lesson-content .lesson-content-title')?.textContent?.trim() };
  });
  assert.match(state.shownTitle || '', new RegExp(PLAIN_LESSON.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    'the plain lesson really did open');
  assert.equal(state.disabled, true, 'the authorization check still blocks completion without an enrollment');
  assert.match(state.title || '', /enroll/i);
});

test('saved walkthrough position is per lesson, not a shared hard-coded id', async t => {
  const { base } = await fixture(t, { completed: lessons.filter(l => l.id !== GATED_LESSON.id) });
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close().catch(() => {}); });

  // A stale key left behind by an older lesson id must not resume the walkthrough.
  const { page } = await learnerPage(t, browser, base, { 'lxp_stage_aeedd8b9-3ca4-444b-962f-3703823200d7': '5' });
  await page.click('#btn-continue-outstanding');
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => document.querySelector('#lxp-counter')?.textContent?.trim()), 'Stage 1 of 6');

  // The position is written under the real lesson id.
  const saved = await page.evaluate(id => sessionStorage.getItem('lxp_stage_' + id), GATED_LESSON.id);
  assert.equal(saved, '0');
});