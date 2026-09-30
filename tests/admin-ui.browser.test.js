const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

const overview = {
  totalUsers: 17, completedAssessmentAttempts: 8, usersWithCompletedAssessment: 6,
  coursesStarted: 11, lessonsCompleted: 24, examsAttempted: 4, examsPassed: 3, certificatesIssued: 2
};
const user = {
  id: '01234567-89ab-cdef-0123-456789abcdef', fullName: 'Asha Example', email: 'asha@example.test',
  avatarUrl: 'https://storage.example.test/profile-avatars/asha.jpg',
  joinedAt: '2025-01-01T12:00:00Z', lastSignInAt: '2025-02-01T12:00:00Z',
  assessmentCount: 2, retestCount: 1, courseCount: 1, certificateCount: 1
};
const journey = {
  account: { id: user.id, fullName: user.fullName, email: user.email, careerGoal: 'Data Scientist', bio: 'Learning data science', avatarUrl: user.avatarUrl, joinedAt: user.joinedAt, lastSignInAt: user.lastSignInAt },
  assessments: [
    { attemptId: 'a1', attemptNumber: 1, completedAt: user.joinedAt, assessmentVersion: 'v1', topCareers: [{ career: 'Software Developer', score: 82 }], dimensionScores: { 'Software Engineering': 0.75 }, strengths: ['Analytical thinking'] },
    { attemptId: 'a2', attemptNumber: 2, completedAt: '2025-02-15T12:00:00Z', assessmentVersion: 'v2', topCareers: [{ career: 'Data Scientist', score: 88 }], dimensionScores: { 'Data & Analytical Thinking': 0.8 }, strengths: ['Analytical thinking'] }
  ],
  careerProfile: { topCareers: [{ career: 'Data Scientist', score: 88 }], dimensionScores: { 'Data & Analytical Thinking': 0.8 }, strengths: ['Analytical thinking'] },
  courses: [{ courseName: 'Data Foundations', progressPercent: 50, lessonsCompleted: 1, totalLessons: 2, enrolledAt: user.joinedAt, nextLesson: { title: 'Working with tables', label: 'Next incomplete lesson' } }],
  exams: [{ examId: 'e1', title: 'Data exam', courseId: 'course-1', attemptNumber: 1, score: 82, passed: true, startedAt: user.joinedAt, submittedAt: user.lastSignInAt }],
  certificates: [{ certificateId: 'cert-1', courseName: 'Data Foundations', earnedAt: user.lastSignInAt }]
};
const analytics = {
  careerDirectionDistribution: [{ career: 'Data Scientist', attempts: 4 }],
  courses: [{ courseId: 'course-1', courseName: 'Data Foundations', enrollments: 3, completedEnrollments: 1, certificatesIssued: 1 }],
  lessonsCompleted: 24, examAttempts: 4, examsPassed: 3, examPassRate: 75, completedAssessmentAttempts: 8, usersWithCompletedAssessment: 6
};

async function fixture(t, mode = 'admin') {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ mode }) => {
    if (!sessionStorage.getItem('__adminTestInitialized')) {
      sessionStorage.setItem('__adminTestInitialized', '1');
      if (mode !== 'unauth') sessionStorage.setItem('__adminTestToken', 'browser-test-token');
    }
    let session = sessionStorage.getItem('__adminTestToken')
      ? { access_token: sessionStorage.getItem('__adminTestToken'), user: { email: 'admin@example.test' } }
      : null;
    const listeners = [];
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: callback => { listeners.push(callback); return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => { session = null; sessionStorage.removeItem('__adminTestToken'); listeners.forEach(callback => callback('SIGNED_OUT', null)); return { error: null }; }
    } };
    window.__adminTestSignOut = async () => { session = null; listeners.forEach(callback => callback('SIGNED_OUT', null)); };
    if (mode === 'nonadmin') {
      localStorage.setItem('is_admin', 'true');
      localStorage.setItem('role', 'admin');
      sessionStorage.setItem('is_admin', 'true');
      sessionStorage.setItem('role', 'admin');
    }
  }, { mode });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/api/admin/**', route => {
    if (mode === 'nonadmin') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Administrator access required' }) });
    const path = new URL(route.request().url()).pathname.replace('/api/admin/', '');
    const bodies = {
      overview,
      users: { users: [user], page: 1, perPage: 25, total: 1 },
      assessments: { attempts: [{ ...journey.assessments[0], userId: user.id, completed: true }], page: 1, perPage: 25, total: 1 },
      analytics
    };
    if (path.startsWith('users/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(journey) });
    const key = path.split('?')[0];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bodies[key] || {}) });
  });
  const page = await context.newPage();
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  await page.goto(`http://127.0.0.1:${server.address().port}/admin.html`, { waitUntil: 'domcontentloaded' });
  return page;
}

test('unauthenticated and normal accounts see protected access states', async t => {
  const anon = await fixture(t, 'unauth');
  await assert.doesNotReject(anon.getByText('Sign in with an administrator account to continue.').waitFor());
  const regular = await fixture(t, 'nonadmin');
  await assert.doesNotReject(regular.getByText('This account does not have administrator access.').waitFor());
});

test('admin screens render API data without sensitive answer fields', async t => {
  const page = await fixture(t);
  await page.locator('#access-state').waitFor({ state: 'hidden' });
  await page.getByText('17', { exact: true }).waitFor();
  await page.goto(new URL('/admin.html#users', page.url()).href);
  await page.getByText('Asha Example').waitFor();
  assert.equal(await page.locator('.user-identity .user-avatar img').getAttribute('src'), user.avatarUrl);
  await page.getByRole('link', { name: /View journey/ }).click();
  await page.getByText('Learning data science').waitFor();
  assert.equal(await page.locator('.journey-identity .user-avatar img').getAttribute('src'), user.avatarUrl);
  await page.getByText('Working with tables').waitFor();
  assert.match(await page.locator('.journey-story .attempt summary').nth(0).innerText(), /Initial Test/);
  assert.match(await page.locator('.journey-story .attempt summary').nth(1).innerText(), /Retest 1/);
  await page.getByText('Data exam').waitFor();
  await page.getByText('cert-1').waitFor();
  const text = await page.locator('body').innerText();
  assert.equal(/raw answer|answer_key|correct answer/i.test(text), false);
  await page.goto(new URL('/admin.html#assessments', page.url()).href);
  await page.getByText('Software Developer', { exact: false }).first().waitFor();
  await page.goto(new URL('/admin.html#courses', page.url()).href);
  await page.getByText('Data Foundations').waitFor();
  await page.goto(new URL('/admin.html#analytics', page.url()).href);
  await page.getByText('75%', { exact: true }).waitFor();
});

test('normal Supabase logout ends the session and prevents later admin requests', async t => {
  const page = await fixture(t);
  await page.getByText('17', { exact: true }).waitFor();
  let adminRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/admin/')) adminRequests++; });
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL('**/index.html');
  const requestsAfterLogout = adminRequests;
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Sign in with an administrator account to continue.').waitFor();
  assert.equal(await page.locator('#app-content').isHidden(), true);
  const requestsAtSignOut = requestsAfterLogout;
  await page.evaluate(() => { window.location.hash = '#users'; });
  await page.waitForTimeout(150);
  assert.equal(adminRequests, requestsAtSignOut, 'hash navigation after sign-out must not fetch protected data');
});

test('requested viewport widths and Arabic RTL have no horizontal overflow', async t => {
  const page = await fixture(t);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(new URL('/admin.html#assessments', page.url()).href);
    await page.getByText('Software Developer', { exact: false }).first().waitFor();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, `horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#menu-toggle').click();
  assert.match(await page.locator('.admin-shell').getAttribute('class'), /nav-open/);
  await page.locator('#side-nav a[data-page="users"]').click();
  await page.getByText('Asha Example').waitFor();
  assert.doesNotMatch(await page.locator('.admin-shell').getAttribute('class'), /nav-open/);
  await page.evaluate(async () => { localStorage.setItem('aicareer-language', 'ar'); await window.setCareerPathLanguage('ar'); });
  await page.goto(new URL('/admin.html#users', page.url()).href);
  await page.getByText('Asha Example').waitFor();
  const rtl = await page.evaluate(() => ({ dir: document.documentElement.dir, width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.equal(rtl.dir, 'rtl');
  assert.ok(rtl.scroll <= rtl.width + 1, `Arabic horizontal overflow: ${JSON.stringify(rtl)}`);
});
