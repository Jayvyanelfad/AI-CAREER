// Regression coverage for course-detail horizontal alignment.
//
// The course hero is deliberately full-bleed, but everything below it is not:
// styles.css gives #course-progress, #exam-button-container, #course-modules and
// #lesson-content one shared centred track with `margin-inline: auto`.
//
// An older `margin: 18px 0 !important` shorthand on .course-detail-progress beat
// that non-important longhand, so the progress row pinned itself to the left
// edge and left roughly 270px of dead space on the right while every sibling
// below it stayed centred. public/ui-polish.css restores the shared track.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const courseContent = require('../intro-to-ai-course-content');

const COURSE_ID = 'intro_to_ai';
const TRACK = ['#course-progress', '#exam-button-container', '#course-modules'];

const modules = courseContent.modules.map((module, index) => ({
  id: `module-${index + 1}`, course_id: COURSE_ID, title: module.title, description: module.description, order: index + 1
}));
const lessons = [];
modules.forEach((module, moduleIndex) => {
  courseContent.modules[moduleIndex].lessons.forEach((lesson, lessonIndex) => {
    lessons.push({
      id: `lesson-${moduleIndex}-${lessonIndex}`, module_id: module.id, title: lesson.title,
      description: lesson.description, content: lesson.content, duration_minutes: 20,
      lesson_order: lessonIndex + 1, order: lessonIndex + 1
    });
  });
});

async function withCoursePage(t, browser, width, height) {
  const app = express();
  // no-store so a measurement can never be taken against a stale cached page.
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store, must-revalidate'); next(); });
  app.use(express.static('public'));
  app.get('/api/courses/:id', (_req, res) => res.json({
    id: COURSE_ID, title: courseContent.title,
    description: 'An introductory course that explains artificial intelligence and machine learning.',
    category: 'AI & Machine Learning', level: 'beginner', status: 'available',
    image_url: 'images/course-ai.webp', duration_weeks: 6
  }));
  app.get('/api/courses/:id/modules', (_req, res) => res.json({ modules }));
  app.get('/api/modules/:id/lessons', (req, res) => res.json({ lessons: lessons.filter(lesson => lesson.module_id === req.params.id) }));
  app.get('/api/courses/:id/progress/lessons', (_req, res) => res.json({
    completedLessons: lessons.slice(1).map(lesson => lesson.id),
    completedCount: lessons.length - 1, totalLessons: lessons.length, progress: 96
  }));
  app.get('/api/exams', (_req, res) => res.json({ exams: [] }));
  app.get('/api/enrollments/:id', (_req, res) => res.json({ id: 'enr-1', course_id: COURSE_ID, course_name: courseContent.title }));
  app.get('/api/certificate/:id', (_req, res) => res.status(404).json({ error: 'not found' }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  const context = await browser.newContext({ viewport: { width, height } });
  t.after(async () => { await context.close().catch(() => {}); });
  await context.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('aicareer-language', 'en');
    const session = { access_token: 'test-token', user: { id: 'user-1', email: 'learner@example.test' } };
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
    window.getAuthAccessToken = async () => 'test-token';
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/course-detail.html?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  return page;
}

async function trackBoxes(page) {
  return page.evaluate(selectors => {
    const out = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) { out[selector] = null; continue; }
      const rect = element.getBoundingClientRect();
      out[selector] = { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    }
    out.overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    out.heroWidth = Math.round(document.querySelector('#course-header').getBoundingClientRect().width);
    return out;
  }, TRACK);
}

test('progress, exam notices and curriculum share one centred track', async t => {
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close().catch(() => {}); });

  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 820, 1000], ['mobile', 390, 844]]) {
    const page = await withCoursePage(t, browser, width, height);
    const boxes = await trackBoxes(page);

    assert.equal(boxes.overflow, false, `${name}: the course page must not scroll horizontally`);

    const present = TRACK.map(selector => boxes[selector]);
    present.forEach((box, index) => assert.ok(box, `${name}: ${TRACK[index]} must be rendered`));

    // The regression: #course-progress sat at left 0 while its siblings were
    // centred. Every band on the shared track must now start and end together.
    const reference = present[0];
    for (let i = 1; i < present.length; i++) {
      assert.equal(present[i].left, reference.left,
        `${name}: ${TRACK[i]} starts at ${present[i].left} but ${TRACK[0]} starts at ${reference.left}`);
      assert.equal(present[i].right, reference.right,
        `${name}: ${TRACK[i]} ends at ${present[i].right} but ${TRACK[0]} ends at ${reference.right}`);
    }

    // And the track must actually be inset, not hard against the viewport edge.
    assert.ok(reference.left > 0, `${name}: the content track is flush against the left edge (${reference.left}px)`);
    assert.ok(reference.right < width, `${name}: the content track runs past the right edge (${reference.right}px)`);

    // The full-bleed hero is part of the existing design and must survive.
    assert.equal(boxes.heroWidth, width, `${name}: the hero stays full-bleed`);

    await page.close();
  }
});

test('the course page opts into the polish stylesheet through its body class', () => {
  const markup = fs.readFileSync(path.join(__dirname, '..', 'public', 'course-detail.html'), 'utf8');
  assert.match(markup, /<body class="course-detail-page">/,
    'course-detail.html must keep its page class, which scopes the alignment rules');
  assert.match(markup, /<link rel="stylesheet" href="ui-polish\.css" \/>/,
    'course-detail.html must load the polish layer that restores the shared track');
});

test('the polish stylesheet stays balanced and page-scoped', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui-polish.css'), 'utf8');
  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  assert.equal(open, close, `ui-polish.css braces are unbalanced: ${open} open / ${close} close`);

  const courseRules = css.split('}').filter(block => block.includes('#course-progress'));
  for (const block of courseRules) {
    assert.match(block, /course-detail-page/,
      'course-detail rules must stay scoped to the course-detail page');
  }
});