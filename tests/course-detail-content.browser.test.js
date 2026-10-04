const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('course detail renders the lesson learning sequence at mobile widths and in RTL', async t => {
  const app = express(); app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 'course-detail-token'); localStorage.setItem('aicareer-language', 'ar');
    const session = { access_token: 'course-detail-token', user: { id: 'test-user' } };
    window.supabase = { auth: { getSession: async () => ({ data: { session }, error: null }), getUser: async () => ({ data: { user: session.user }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const content = ['Learning Objective','Story','Discovery','Concept','Example','Challenge','Takeaway'].map(title => `<section class="lesson-section"><h3>${title}</h3><p>${title} content for the sample lesson.</p></section>`).join('');
  await context.route('**/api/courses/intro_to_ai', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ course: { id: 'intro_to_ai', title: 'Introduction to AI & ML', description: 'Explore AI and machine learning.', level: 'beginner', duration_weeks: 4, status: 'available' } }) }));
  await context.route('**/api/courses/intro_to_ai/modules', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ modules: [{ id: 'module-1', course_id: 'intro_to_ai', title: 'AI Foundations', description: 'Learn the foundations.', module_order: 1 }] }) }));
  await context.route('**/api/modules/module-1/lessons', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lessons: [{ id: 'lesson-1', module_id: 'module-1', title: 'What is AI?', content, lesson_order: 1 }] }) }));
  await context.route('**/api/courses/intro_to_ai/progress/lessons', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ completedLessons: [] }) }));
  await context.route('**/api/exams?course_id=intro_to_ai', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exams: [] }) }));
  await context.route('**/api/enrollments/intro_to_ai', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/course-detail.html?id=intro_to_ai`, { waitUntil: 'domcontentloaded' });
  await page.locator('.lesson-item').waitFor();
  assert.equal(await page.locator('#btn-enroll-free').isVisible(), true, 'an explicitly available course keeps its enrollment action');
  await page.locator('.lesson-item').click();
  await page.locator('.lesson-content-text').waitFor();
  assert.equal(await page.locator('.lesson-section h3').count(), 7);
  assert.equal(await page.locator('.lesson-content-title').innerText(), 'What is AI?');
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(size.scroll <= size.client + 1, `horizontal overflow at ${width}px: ${JSON.stringify(size)}`);
  }

  const courseUrl = `http://127.0.0.1:${server.address().port}/course-detail.html?id=intro_to_ai`;
  await page.route('**/api/courses/intro_to_ai', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ course: { id: 'intro_to_ai', title: 'Introduction to AI & ML', description: 'Explore AI and machine learning.', level: 'beginner', duration_weeks: 4, status: 'coming_soon' } }) }));
  await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#course-header .course-availability').waitFor();
  const arabicComingSoon = await page.evaluate(async () => (await (await fetch('locales/ar.json')).json()).ui.comingSoon);
  assert.equal(await page.locator('#course-header .course-availability').innerText(), arabicComingSoon);
  assert.equal(await page.locator('#btn-enroll-free').count(), 0, 'coming-soon detail page has no enrollment action');

  await page.unroute('**/api/courses/intro_to_ai');
  await page.route('**/api/courses/intro_to_ai', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ course: { id: 'intro_to_ai', title: 'Introduction to AI & ML', description: 'Explore AI and machine learning.', level: 'beginner', duration_weeks: 4, status: null } }) }));
  await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#exam-button-container [role="status"]').waitFor();
  const arabicUnavailable = await page.evaluate(async () => (await (await fetch('locales/ar.json')).json()).ui.notAvailable);
  assert.equal(await page.locator('#exam-button-container [role="status"]').innerText(), arabicUnavailable);
  assert.equal(await page.locator('#btn-enroll-free').count(), 0, 'unknown availability has no enrollment action');
  await context.close();
});
