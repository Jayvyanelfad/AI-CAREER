const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

const RESULT = { result: {
  assessment_version: 'career-profile-v1',
  dimension_scores: {
    'Software Engineering': 0.9, 'Data & Analytical Thinking': 0.85,
    'AI & Computational Intelligence': 0.95, 'Systems & Infrastructure': 0.6,
    'Security & Reliability': 0.5, 'Product & User Orientation': 0.7,
    'Design & Human Experience': 0.65, 'Leadership & Delivery': 0.55
  },
  top_careers: [
    { career: 'AI/ML Engineer', score: 92.5 },
    { career: 'Data Scientist With A Very Long Title Here', score: 81.25 },
    { career: 'Full Stack Developer', score: 77 }
  ],
  strengths: []
} };

async function profilePage(t, width) {
  const app = express(); app.use(express.json()); app.use(express.static('public'));
  app.get('/api/profile', (req, res) => res.json({ id: 'u1', fullName: 'Asha', careerGoal: 'AI', bio: '', preferredLanguage: 'en', themePreference: 'dark', avatarUrl: null }));
  app.get('/api/career-test', (req, res) => res.json(RESULT));
  app.get('/api/courses', (req, res) => res.json({ courses: [] }));
  app.get('/api/dashboard', (req, res) => res.json({ user: {}, careerTest: null, enrollments: [], certificates: [] }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 't');
    localStorage.setItem('aicareer-language', 'en');
    window.supabase = { auth: {
      getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null }),
      getUser: async () => ({ data: { user: { id: 'u1', email: 'a@x.test', user_metadata: {} } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/profile.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.career-alignment-row').length === 3, null, { timeout: 15000 });
  await page.waitForTimeout(500);
  return page;
}

test('profile results use full width without overlap at desktop and mobile', async t => {
  for (const width of [1440, 390]) {
    const page = await profilePage(t, width);
    const metrics = await page.evaluate(() => {
      const section = document.querySelector('.profile-career-hero');
      const dims = document.querySelector('#career-dimensions');
      const rows = [...document.querySelectorAll('.career-alignment-row')].map(el => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      });
      return {
        sectionWidth: Math.round(section.getBoundingClientRect().width),
        dimsWidth: Math.round(dims.getBoundingClientRect().width),
        parentClass: dims.parentElement.className,
        overlap: rows.some((a, i) => rows.some((b, j) => j > i && a.top < b.bottom - 1 && b.top < a.bottom - 1 && Math.abs(a.top - b.top) > 1))
      };
    });
    assert.ok(metrics.sectionWidth > 0, 'results section renders');
    assert.ok(metrics.dimsWidth >= metrics.sectionWidth - 64 && metrics.dimsWidth <= metrics.sectionWidth,
      `dimensions fill the section content box at ${width}px (got ${metrics.dimsWidth} of ${metrics.sectionWidth})`);
    assert.equal(metrics.overlap, false, `career cards do not overlap at ${width}px`);
    await page.context().close();
  }
});

test('profile photo follows the size system', async t => {
  const desktop = await profilePage(t, 1440);
  const avatar = await desktop.evaluate(() => {
    const r = document.querySelector('#profile-avatar').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  assert.ok(avatar.w >= 156 && avatar.w <= 164, `profile photo should honor the 160px desktop size, got ${avatar.w}`);
  await desktop.context().close();
  const mobile = await profilePage(t, 390);
  const small = await mobile.evaluate(() => {
    const r = document.querySelector('#profile-avatar').getBoundingClientRect();
    return Math.round(r.width);
  });
  assert.ok(small < avatar.w, 'photo shrinks on small screens');
  await mobile.context().close();
});
