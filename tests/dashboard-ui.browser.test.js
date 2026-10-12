const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const assessment = {
  completed: true, assessmentVersion: 'career-profile-v1',
  topCareers: [{ career: 'AI/ML Engineer', score: 76 }, { career: 'Software Developer', score: 68 }],
  dimensionScores: { 'Software Engineering': 0.7, 'AI & Computational Intelligence': 0.9, 'Data & Analytical Thinking': 0.8 }
};
const catalog = { courses: [
  { id: 'intro_to_ai', title: 'Introduction to AI', description: 'Explore the foundations of artificial intelligence.', category: 'AI & Machine Learning', status: 'available' },
  { id: 'python_for_careers', title: 'Python for Careers', description: 'Learn Python through practical work.', category: 'Software Engineering', status: 'coming_soon' },
  { id: 'advanced_ml', title: 'Advanced Machine Learning', description: 'Study machine learning methods.', category: 'AI & Machine Learning', status: 'available' }
], career_course_mapping: { 'AI/ML Engineer': ['advanced_ml', 'intro_to_ai'] } };

test('authenticated dashboard renders new, returning, course and certificate states safely', async t => {
  const app = express(); app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });

  async function openDashboard(fixture, language = 'en', coursesAvailable = true) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(({ lang }) => {
      localStorage.setItem('token', 'expired-token'); localStorage.setItem('aicareer-language', lang);
      const session = { access_token: 'fresh-session-token', user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } };
      window.supabase = { auth: { getSession: async () => ({ data: { session }, error: null }), getUser: async () => ({ data: { user: session.user }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) } };
    }, { lang: language });
    await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await context.route('**/fonts.googleapis.com/**', route => route.abort());
    await context.route('**/api/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) }));
    await context.route('**/api/courses', route => route.fulfill(coursesAvailable
      ? { status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }
      : { status: 503, contentType: 'application/json', body: '{}' }));
    const page = await context.newPage();
    page.on('pageerror', error => console.error('Dashboard browser error:', error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/dashboard.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#dashboard-welcome')?.textContent.trim());
    await page.waitForFunction(() => {
      const grid = document.querySelector('#explore-grid');
      return grid && (grid.querySelector('.explore-card') || grid.querySelector('.empty-copy'));
    });
    return { context, page };
  }

  const fresh = await openDashboard({ user: { id: userId, name: 'Asha Learner' }, careerTest: null, enrollments: [], certificates: [] });
  assert.match(await fresh.page.locator('#dashboard-welcome').innerText(), /Asha/);
  assert.match(await fresh.page.locator('#career-summary').innerText(), /career direction/i);
  assert.match(await fresh.page.locator('#courses-grid').innerText(), /enroll/i);
  assert.match(await fresh.page.locator('#certificates-grid').innerText(), /certificates/i);
  assert.equal(await fresh.page.locator('#welcome-primary').getAttribute('href'), 'career-test.html');
  assert.deepEqual(await fresh.page.locator('#explore-grid a[href^="course-detail.html?id="]').count(), 2);
  assert.equal(await fresh.page.locator('#explore-grid').getByText(/coming soon/i).count(), 1);
  assert.equal(await fresh.page.locator('#explore-grid a[href*="python_for_careers"]').count(), 0);
  assert.equal(await fresh.page.evaluate(() => performance.getEntriesByType('resource').some(entry => new URL(entry.name).pathname.endsWith('/course-catalog-config.json'))), false, 'dashboard does not request the unserved catalog config');
  assert.equal(await fresh.page.locator('#explore-grid .eyebrow').first().innerText(), 'AI & Machine Learning');
  await fresh.context.close();

  const returning = await openDashboard({ user: { id: userId, name: 'Asha Learner' }, careerTest: assessment, enrollments: [], certificates: [] });
  assert.match(await returning.page.locator('#career-summary').innerText(), /AI\/ML Engineer/);
  assert.match(await returning.page.locator('#career-summary').innerText(), /What we noticed/);
  assert.doesNotMatch(await returning.page.locator('#career-summary').innerText(), /%|confidence|winner/i);
  assert.equal(await returning.page.locator('#welcome-secondary').isVisible(), true);
  assert.equal(await returning.page.locator('#welcome-secondary').getAttribute('href'), 'career-test.html?view=result');
  assert.equal(await returning.page.locator('#career-summary .insight-panel > a').getAttribute('href'), 'career-test.html?view=result');
  assert.match(await returning.page.locator('#explore-grid').innerText(), /Coming soon/i);
  assert.equal(await returning.page.locator('#explore-grid a[href*="python_for_careers"]').count(), 0);
  await returning.context.close();

  const localCatalog = await openDashboard({ user: { id: userId, name: 'Asha' }, careerTest: assessment, enrollments: [], certificates: [] }, 'en', false);
  assert.equal(await localCatalog.page.locator('#explore-grid a[href^="course-detail.html?id="]').count(), 0, 'unknown fallback status does not imply availability');
  assert.equal(await localCatalog.page.locator('#explore-grid').getByText(/coming soon/i).count(), 0);
  await localCatalog.context.close();

  const enrolled = await openDashboard({ user: { id: userId, name: 'Asha Learner' }, careerTest: assessment, enrollments: [{ courseId: 'intro_to_ai', courseName: 'Introduction to AI', progress: 35, progressAvailable: true, nextLessonTitle: 'Neural networks' }], certificates: [{ id: 'cert-123', course_name: 'Introduction to AI', earned_at: '2026-06-01T00:00:00Z' }] });
  assert.match(await enrolled.page.locator('#courses-grid').innerText(), /Introduction to AI/);
  assert.match(await enrolled.page.locator('#courses-grid').innerText(), /Neural networks/);
  assert.equal(await enrolled.page.locator('#courses-grid [role="progressbar"]').getAttribute('aria-valuenow'), '35');
  assert.match(await enrolled.page.locator('#certificates-grid').innerText(), /Introduction to AI/);
  assert.match(await enrolled.page.locator('#certificates-grid a').getAttribute('href'), /certificateId=cert-123/);
  await enrolled.context.close();
});

test('dashboard stays within requested viewport widths and translates Arabic RTL', async t => {
  const app = express(); app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 'token'); localStorage.setItem('aicareer-language', 'ar');
    const session = { access_token: 'fresh-session-token', user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } };
    window.supabase = { auth: { getSession: async () => ({ data: { session }, error: null }), getUser: async () => ({ data: { user: session.user }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  await context.route('**/api/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: userId, name: 'Asha' }, careerTest: assessment, enrollments: [], certificates: [] }) }));
  await context.route('**/api/courses', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  const page = await context.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#dashboard-welcome')?.textContent.trim());
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  assert.equal(await page.locator('h1').innerText(), 'مرحبًا بعودتك، Asha');
  assert.match(await page.locator('#career-summary').innerText(), /مهندس/);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(30);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.client + 1, `horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
  }
  await context.close();
});
