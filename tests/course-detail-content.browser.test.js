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
  let savedEnrollment = null;
  let enrollRequest = null;
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
  await context.route('**/api/modules/module-1/lessons', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lessons: [
    { id: 'lesson-1', module_id: 'module-1', title: 'What is AI?', content, lesson_order: 1 },
    { id: 'lesson-2', module_id: 'module-1', title: 'How does machine learning work?', content, lesson_order: 2 }
  ] }) }));
  await context.route('**/api/courses/intro_to_ai/progress/lessons', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ completedLessons: [] }) }));
  await context.route('**/api/exams?course_id=intro_to_ai', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exams: [] }) }));
  await context.route('**/api/enrollments/intro_to_ai', route => route.fulfill(savedEnrollment
    ? { status: 200, contentType: 'application/json', body: JSON.stringify(savedEnrollment) }
    : { status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'NOT_ENROLLED' }) }));
  await context.route('**/api/enroll', route => {
    enrollRequest = {
      method: route.request().method(),
      authorization: route.request().headers().authorization,
      body: route.request().postDataJSON()
    };
    savedEnrollment = { id: 'enrollment-1', courseId: 'intro_to_ai', courseName: 'Introduction to AI & ML', progress: 0 };
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ enrollment: savedEnrollment }) });
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/course-detail.html?id=intro_to_ai`, { waitUntil: 'domcontentloaded' });
  await page.locator('.lesson-item').first().waitFor();
  assert.equal(await page.locator('#btn-enroll-free').isVisible(), true, 'an explicitly available course keeps its enrollment action');
  await page.evaluate(() => localStorage.setItem('token', 'stale-token'));
  await page.locator('#btn-enroll-free').click();
  await page.waitForFunction(() => !document.querySelector('#btn-enroll-free'));
  const arabicEnrolled = await page.evaluate(async () => (await (await fetch('locales/ar.json')).json()).coverage.youAreEnrolled);
  assert.match(await page.locator('#exam-button-container').innerText(), new RegExp(arabicEnrolled));
  assert.deepEqual(enrollRequest, {
    method: 'POST',
    authorization: 'Bearer course-detail-token',
    body: { courseId: 'intro_to_ai' }
  });
  assert.equal(await page.locator('#btn-enroll-free').count(), 0, 'successful enrollment updates the action immediately');
  assert.match(await page.locator('#exam-button-container').innerText(), /0\/2/, 'enrollment loads lesson progress and keeps the exam locked');
  assert.equal(await page.locator('#exam-button-container a[href^="exam.html"]').count(), 0);
  await page.locator('.lesson-item').first().click();
  await page.locator('.lesson-content-text').waitFor();
  assert.equal(await page.locator('.lesson-section h3').count(), 7);
  assert.equal(await page.locator('.lesson-content-title').innerText(), 'What is AI?');
  assert.equal((await page.locator('.lesson-item').first().getAttribute('class')).includes('active'), true, 'the current lesson has a distinct active state');
  assert.equal((await page.locator('.lesson-item').first().getAttribute('class')).includes('completed'), false, 'an uncompleted current lesson is not shown as completed');
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(size.scroll <= size.client + 1, `horizontal overflow at ${width}px: ${JSON.stringify(size)}`);
  }

  const courseUrl = `http://127.0.0.1:${server.address().port}/course-detail.html?id=intro_to_ai`;
  savedEnrollment = null;
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

  await page.unroute('**/api/courses/intro_to_ai');
  let persistedCompletedLessons = [];
  await page.route('**/api/courses/intro_to_ai/progress/lessons', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      completedLessons: persistedCompletedLessons,
      completedCount: persistedCompletedLessons.length,
      totalLessons: 2,
      progress: persistedCompletedLessons.length * 50
    })
  }));
  await page.route('**/api/enrollments/intro_to_ai', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ course_id: 'intro_to_ai', progress: 0 })
  }));
  await page.route('**/api/lessons/lesson-1/complete', route => {
    persistedCompletedLessons = ['lesson-1'];
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        completedLessonIds: persistedCompletedLessons,
        completedLessons: 1,
        totalLessons: 2,
        progress: 50
      })
    });
  });
  await page.route('**/api/lessons/lesson-2/complete', route => {
    persistedCompletedLessons = ['lesson-1', 'lesson-2'];
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        completedLessonIds: persistedCompletedLessons,
        completedLessons: 2,
        totalLessons: 2,
        progress: 100
      })
    });
  });
  await page.goto(courseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.lesson-item').first().click();
  await page.locator('#btn-next-lesson').click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('lesson') === '1');
  assert.equal(await page.locator('.lesson-content-title').innerText(), 'How does machine learning work?');
  await page.locator('#btn-prev-lesson').scrollIntoViewIfNeeded();
  const scrollBeforeNext = await page.evaluate(() => window.scrollY);
  await page.locator('#btn-prev-lesson').click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('lesson') === '0');
  assert.equal(await page.locator('.lesson-content-title').innerText(), 'What is AI?');
  assert.equal(await page.evaluate(() => window.scrollY), scrollBeforeNext, 'lesson navigation preserves the reader’s scroll position');
  await page.goBack();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('lesson') === '1');
  assert.equal(await page.locator('.lesson-content-title').innerText(), 'How does machine learning work?');
  await page.goForward();
  await page.waitForFunction(() => new URL(location.href).searchParams.get('lesson') === '0');
  await page.locator('#btn-mark-complete').click();
  await page.locator('.lesson-completion-state').waitFor();
  assert.equal(await page.locator('#btn-mark-complete').isDisabled(), true);
  assert.equal(await page.locator('.module-progress-label').innerText(), '1/2 completed');
  assert.equal(await page.locator('#course-progress').innerText().then(text => /50%/.test(text)), true);
  assert.equal(await page.locator('.lesson-item.completed.active').count(), 1, 'completion remains distinct from the current lesson state');
  assert.equal(await page.locator('#exam-button-container a[href^="exam.html"]').count(), 0, 'partial completion keeps the exam locked');
  await page.goto(`${courseUrl}&module=0&lesson=0`, { waitUntil: 'domcontentloaded' });
  await page.locator('.lesson-item.completed').waitFor({ state: 'attached' });
  await page.locator('.lesson-completion-state').waitFor();
  assert.equal(await page.locator('#btn-mark-complete').isDisabled(), true, 'the persisted completion remains authoritative after reload');
  await page.locator('#btn-back-to-curriculum').click();
  await page.locator('.lesson-item').first().click();
  await page.locator('.lesson-completion-state').waitFor();
  assert.equal(await page.locator('#btn-mark-complete').isDisabled(), true, 'completion remains after navigating away and back');

  let issuedCertificate = null;
  await page.route('**/api/exams?course_id=intro_to_ai', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ exams: [{ id: 'exam-1', title: 'Final Exam' }] })
  }));
  await page.route('**/api/certificate/intro_to_ai', route => issuedCertificate
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(issuedCertificate) })
    : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/certificate/intro_to_ai/issue', route => {
    issuedCertificate = { certificateId: 'certificate-1' };
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ certificate: issuedCertificate })
    });
  });
  await page.goto(`${courseUrl}&module=0&lesson=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.lesson-item') !== null);
  const detailView = await page.evaluate(() => ({
    url: location.href,
    modulesDisplay: getComputedStyle(document.querySelector('#course-modules')).display,
    lessonContentHidden: document.querySelector('#lesson-content').classList.contains('hidden'),
    actionsDisplay: getComputedStyle(document.querySelector('#lesson-actions')).display,
    backClass: document.querySelector('#btn-back-to-curriculum').className,
    courseHeader: document.querySelector('#course-header').innerText
  }));
  if (detailView.modulesDisplay === 'none' && detailView.lessonContentHidden) {
    throw new Error(`Inconsistent course detail view: ${JSON.stringify(detailView)}`);
  }
  if (await page.locator('#btn-back-to-curriculum').isVisible()) {
    await page.locator('#btn-back-to-curriculum').click();
  }
  if (!(await page.locator('.lesson-item').nth(1).isVisible())) {
    await page.locator('.module-section summary').first().click();
  }
  await page.locator('.lesson-item').nth(1).click();
  await page.locator('#btn-mark-complete').click();
  await page.locator('#exam-button-container a[href="exam.html?id=exam-1"]').waitFor();
  assert.equal(await page.locator('#exam-button-container').getByText(/1\/2/).count(), 0);
  await page.locator('#btn-recover-certificate').click();
  await page.locator('a[href="certificate.html?certificateId=certificate-1"]').waitFor();
  await page.goto(`${courseUrl}&module=0&lesson=0`, { waitUntil: 'domcontentloaded' });
  await page.locator('a[href="certificate.html?certificateId=certificate-1"]').waitFor();
  assert.equal(await page.locator('a[href="certificate.html?certificateId=certificate-1"]').count(), 1, 'the issued certificate is retrieved and displayed after reload');
  await page.route('**/api/courses/intro_to_ai/progress/lessons', route => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Database error' })
  }));
  await page.goto(`${courseUrl}&module=0&lesson=0`, { waitUntil: 'domcontentloaded' });
  const progressErrorText = await page.evaluate(async () => (await (await fetch('locales/ar.json')).json()).coverage.progressLoadError);
  const unavailableText = await page.evaluate(async () => (await (await fetch('locales/ar.json')).json()).coverage.unavailableLabel);
  await page.locator('#exam-button-container').getByText(progressErrorText).waitFor();
  assert.equal(await page.locator('#progress-percent').innerText(), unavailableText, 'progress read failures are not presented as zero percent');

  await page.route('**/api/enrollments/intro_to_ai', route => route.fulfill({
    status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Database error' })
  }));
  await page.goto(`${courseUrl}&module=0&lesson=0`, { waitUntil: 'domcontentloaded' });
  const enrollmentErrorText = await page.evaluate(async () => (await (await fetch('locales/ar.json')).json()).coverage.verifyEnrollmentError);
  await page.locator('#exam-button-container').getByText(enrollmentErrorText).waitFor();
  assert.equal(await page.locator('#btn-enroll-free').count(), 0, 'an enrollment lookup failure never offers an unsafe enrollment retry');
  await context.close();
});
