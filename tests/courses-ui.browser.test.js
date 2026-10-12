const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

async function openCourses(t, authenticated, catalog = { categories: ['Software Engineering'], courses: [] }, options = {}) {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: options.viewport || { width: 1280, height: 900 } });
  await context.addInitScript(({ isAuthenticated, language }) => {
    if (language) localStorage.setItem('aicareer-language', language);
    const session = isAuthenticated ? { access_token: 'courses-test-token', user: { id: 'test-user' } } : null;
    window.supabase = {
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getUser: async () => ({ data: { user: session?.user }, error: null }),
        signOut: async () => ({ error: null })
      }
    };
  }, { isAuthenticated: authenticated, language: options.language });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  let catalogRequestCount = 0;
  await context.route('**/api/courses', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(catalog),
    headers: (() => { catalogRequestCount++; return {}; })()
  }));
  await context.route('**/api/enrollments', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ enrollments: [] })
  }));
  const enrollmentRequests = [];
  await context.route('**/api/enroll', route => {
    enrollmentRequests.push({
      method: route.request().method(),
      body: route.request().postDataJSON()
    });
    const success = options.enrollStatus !== 500;
    return route.fulfill({
      status: options.enrollStatus || 201,
      contentType: 'application/json',
      body: JSON.stringify(success ? { enrollment: { courseId: 'available-course' } } : { error: 'database unavailable' })
    });
  });
  const page = await context.newPage();
  page.getEnrollmentRequests = () => enrollmentRequests;
  page.getCatalogRequestCount = () => catalogRequestCount;
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  await page.goto(`http://127.0.0.1:${server.address().port}/courses.html`, { waitUntil: 'domcontentloaded' });
  return page;
}

test('course catalog presents coming-soon status and blocks enrollment', async t => {
  const page = await openCourses(t, true, {
    categories: ['Software Engineering'],
    courses: [
      { id: 'available-course', title: 'Available Course', description: '', image_url: '', level: 'beginner', duration_weeks: 4, category: 'Software Engineering', premium: false, status: 'available' },
      { id: 'coming-course', title: 'Coming Course', description: '', image_url: '', level: 'beginner', duration_weeks: 4, category: 'Software Engineering', premium: false, status: 'coming_soon' }
    ]
  });

  await page.locator('[data-course-id="coming-course"]').waitFor();
  const comingSoon = page.locator('[data-course-id="coming-course"]');
  assert.match(await comingSoon.innerText(), /Coming soon/i);
  assert.equal(await comingSoon.locator('button').isDisabled(), true);
  assert.equal(await comingSoon.locator('a').count(), 0);
  assert.equal(await comingSoon.getAttribute('onclick'), null);
  assert.equal(await page.locator('[data-course-id="available-course"] .enroll-btn').isEnabled(), true);
});

test('course enrollment modal confirms the selected course and updates its state once', async t => {
  const page = await openCourses(t, true, {
    categories: ['Software Engineering'],
    courses: [
      { id: 'available-course', title: 'Available Course', description: '', image_url: '', level: 'beginner', duration_weeks: 4, category: 'Software Engineering', premium: false, status: 'available' }
    ]
  });
  const card = page.locator('[data-course-id="available-course"]');
  await card.locator('.enroll-btn').click();
  const modal = page.locator('#enroll-modal');
  await modal.waitFor({ state: 'visible' });
  assert.equal(await modal.getAttribute('role'), 'dialog');
  assert.match(await page.locator('#modal-enroll-prompt').innerText(), /Available Course/);
  await page.locator('#confirm-enroll').click();
  await page.locator('#enrollment-feedback').getByText(/enrolled in Available Course/i).waitFor();
  assert.equal(await card.locator('.enroll-btn').isDisabled(), true);
  assert.deepEqual(page.getEnrollmentRequests(), [{
    method: 'POST',
    body: { courseId: 'available-course' }
  }]);
  assert.equal(page.getCatalogRequestCount(), 1, 'the page loads course catalog data once');
});

test('enrollment API failures remain visible and do not mark the course enrolled', async t => {
  const page = await openCourses(t, true, {
    categories: ['Software Engineering'],
    courses: [
      { id: 'available-course', title: 'Available Course', description: '', image_url: '', level: 'beginner', duration_weeks: 4, category: 'Software Engineering', premium: false, status: 'available' }
    ]
  }, { enrollStatus: 500 });
  const card = page.locator('[data-course-id="available-course"]');
  await card.locator('.enroll-btn').click();
  await page.locator('#confirm-enroll').click();
  await page.locator('#enrollment-feedback[role="alert"]').getByText(/Enrollment failed/).waitFor();
  assert.equal(await card.locator('.enroll-btn').isDisabled(), false);
  assert.equal(await page.locator('#confirm-enroll').isDisabled(), false);
});

test('anonymous course catalog uses the existing authentication redirect', async t => {
  const page = await openCourses(t, false);
  await page.waitForURL(url => url.pathname.endsWith('/login.html'));
  const url = new URL(page.url());
  assert.equal(url.searchParams.get('authRequired'), '1');
  assert.equal(url.searchParams.get('next'), '/courses.html');
});

test('course catalog is responsive and navigable in Arabic RTL and English', async t => {
  const catalog = {
    categories: ['AI & Machine Learning', 'Software Engineering', 'Data'],
    courses: [
      { id: 'intro_to_ai', title: 'Introduction to AI & ML', description: 'Explore AI foundations.', image_url: '/images/courses-hero.webp', level: 'beginner', duration_weeks: 4, category: 'AI & Machine Learning', premium: false, status: 'available' },
      { id: 'python_for_careers', title: 'Python for Career Development', description: 'Build a useful programming foundation.', image_url: '/images/courses-hero.webp', level: 'beginner', duration_weeks: 4, category: 'Software Engineering', premium: false, status: 'coming_soon' },
      { id: 'data_analytics_basics', title: 'Data Analytics Basics', description: 'Explore data and analysis.', image_url: '/images/courses-hero.webp', level: 'beginner', duration_weeks: 4, category: 'Data', premium: false, status: 'available' }
    ]
  };
  const page = await openCourses(t, true, catalog, { viewport: { width: 390, height: 844 }, language: 'ar' });
  await page.locator('[data-course-id="intro_to_ai"]').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.course-image img')].every(image => image.complete && image.naturalWidth > 0));
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');

  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      cards: document.querySelectorAll('.course-card').length,
      categories: document.querySelectorAll('.course-category-group').length,
      imagesLoaded: [...document.querySelectorAll('.course-image img')].every(image => image.naturalWidth > 0),
      titleFontSize: getComputedStyle(document.querySelector('.course-card h3')).fontSize
    }));
    assert.ok(metrics.content <= metrics.viewport + 1, `horizontal overflow at ${width}px: ${JSON.stringify(metrics)}`);
    assert.equal(metrics.cards, 3, 'course cards render at each viewport');
    assert.equal(metrics.categories, 3, 'category sections render at each viewport');
    assert.ok(metrics.imagesLoaded, 'course artwork loads');
    assert.ok(Number.parseFloat(metrics.titleFontSize) > 0, 'course title typography is applied');

    const toggle = page.locator('.auth-nav-toggle');
    if (width <= 900) {
      assert.equal(await toggle.isVisible(), true, `mobile menu toggle is visible at ${width}px`);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      const nav = page.locator(`#${await toggle.getAttribute('aria-controls')}`);
      assert.equal(await nav.locator('a[href="courses.html"]').isVisible(), true);
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    } else {
      assert.equal(await toggle.isVisible(), false, `mobile menu toggle is hidden at ${width}px`);
      assert.equal(await page.locator('.auth-responsive-nav a[href="courses.html"]').isVisible(), true);
    }

    assert.equal(await page.locator('[data-course-id="intro_to_ai"] a[href="course-detail.html?id=intro_to_ai"]').count(), 1);
    assert.equal(await page.locator('[data-course-id="intro_to_ai"] .enroll-btn').isEnabled(), true);
    assert.equal(await page.locator('[data-course-id="python_for_careers"] a').count(), 0);
    assert.equal(await page.locator('[data-course-id="python_for_careers"] button').isDisabled(), true);
  }
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
});
