const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

// Regression coverage for the reported course-completion defects:
//  - the course looked stuck at 25/26 with no pointer to the missing lesson
//  - no reachable final-exam call to action
//  - the curriculum heading / "n/m completed" indicator overflowed its card
//
// Progress numbers are always supplied by the server here; the page must never
// invent or locally adjust them.

const COURSE_ID = 'intro_to_ai';
const MODULE_ID = 'module-1';

// Three modules / eight lessons mirrors the reported shape of the course.
const CURRICULUM = [
  { id: 'module-1', course_id: COURSE_ID, title: 'AI Foundations & History', description: '', module_order: 1 },
  { id: 'module-2', course_id: COURSE_ID, title: 'Core Machine Learning', description: '', module_order: 2 }
];

const LESSONS = {
  'module-1': [
    { id: 'lesson-1', module_id: 'module-1', title: 'What is AI?', lesson_order: 1, content: 'Body one.', duration_minutes: 10 },
    { id: 'lesson-2', module_id: 'module-1', title: 'History of AI', lesson_order: 2, content: 'Body two.', duration_minutes: 10 },
    { id: 'lesson-3', module_id: 'module-1', title: 'Narrow vs General AI', lesson_order: 3, content: 'Body three.', duration_minutes: 10 },
    { id: 'lesson-4', module_id: 'module-1', title: 'Machine Learning Basics', lesson_order: 4, content: 'Body four.', duration_minutes: 10 }
  ],
  'module-2': [
    { id: 'lesson-5', module_id: 'module-2', title: 'Supervised Learning', lesson_order: 1, content: 'Body five.', duration_minutes: 10 },
    { id: 'lesson-6', module_id: 'module-2', title: 'Unsupervised Learning', lesson_order: 2, content: 'Body six.', duration_minutes: 10 }
  ]
};

const ALL_LESSON_IDS = Object.values(LESSONS).flat().map(lesson => lesson.id);
const TOTAL = ALL_LESSON_IDS.length;

function lesson(id, completed) {
  return {
    id,
    title: id.replace(/-/g, ' '),
    content: 'Lesson body.',
    lesson_order: 1,
    duration_minutes: 10,
    completed: Boolean(completed)
  };
}

/**
 * Mount the real course page with a stubbed backend.
 * `completed` is the authoritative set of completed lesson ids the server holds.
 */
async function coursePage(t, { width = 1280, height = 900, completed = [], exam = true, completeFails = false } = {}) {
  let completedIds = new Set(completed);

  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    localStorage.setItem('token', 'course-detail-token');
    localStorage.setItem('aicareer-language', 'en');
    const session = { access_token: 'course-detail-token', user: { id: 'test-user' } };
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
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  const notFound = route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });

  await page.route(`**/api/courses/${COURSE_ID}`, route => json(route, {
    course: { id: COURSE_ID, title: 'Introduction to AI & ML', description: 'Explore AI.', level: 'beginner', duration_weeks: 4, status: 'available' }
  }));
  await page.route(`**/api/courses/${COURSE_ID}/modules`, route => json(route, { modules: CURRICULUM }));
  for (const [moduleId, lessons] of Object.entries(LESSONS)) {
    await page.route(`**/api/modules/${moduleId}/lessons`, route => json(route, { lessons }));
  }
  await page.route(`**/api/enrollments/${COURSE_ID}`, route => json(route, {
    id: 'enrollment-1', courseId: COURSE_ID, courseName: 'Introduction to AI & ML', progress: 0
  }));
  // Mirrors the real GET /api/courses/:id/progress/lessons response exactly.
  await page.route(`**/api/courses/${COURSE_ID}/progress/lessons`, route => json(route, {
    completedLessons: [...completedIds],
    completedCount: completedIds.size,
    totalLessons: TOTAL,
    progress: Math.round((completedIds.size / TOTAL) * 100)
  }));
  await page.route('**/api/exams?course_id=*', route => json(route, {
    exams: exam ? [{ id: 'exam-1', course_id: COURSE_ID, title: 'Final Exam', is_final: true }] : []
  }));
  await page.route('**/api/certificate/*', notFound);

  // Persisting a completion is the one write the page is allowed to make. The
  // response mirrors the real POST /api/lessons/:id/complete: `completedLessons`
  // is the refreshed count and `completedLessonIds` is the id array.
  const completeRequests = [];
  await page.route('**/api/lessons/*/complete', route => {
    const id = route.request().url().match(/lessons\/([^/]+)\/complete/)[1];
    completeRequests.push(id);
    if (completeFails) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Database error' }) });
    }
    completedIds = new Set([...completedIds, id]);
    return json(route, {
      lessonId: id,
      completed: true,
      completedLessons: completedIds.size,
      totalLessons: TOTAL,
      progress: Math.round((completedIds.size / TOTAL) * 100),
      completedLessonIds: [...completedIds]
    });
  });

  const url = `http://127.0.0.1:${server.address().port}/course-detail.html?id=${COURSE_ID}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('#course-modules .module-section').first().waitFor();

  return {
    page,
    context,
    completeRequests,
    pageErrors,
    url,
    serverCompleted: () => new Set(completedIds),
    // Re-read progress exactly as a fresh page load would.
    async reload() {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.locator('#course-modules .module-section').first().waitFor();
    },
    async openLesson(moduleIndex, lessonIndex) {
      await page.locator('.lesson-item').nth(0).waitFor();
      if (!(await page.locator('.lesson-item').nth(lessonIndex).isVisible())) {
        await page.locator('.module-section summary').nth(moduleIndex).click();
      }
      await page.locator('.lesson-item').nth(lessonIndex).click();
      await page.locator('#lesson-actions').waitFor();
    }
  };
}

// The header bar shows a percentage; the "completed/total" requirement count is
// rendered in the exam button area. Read both so neither is assumed.
const percentText = page => page.locator('#progress-percent').innerText();
const requirementText = page => page.locator('#exam-button-container').innerText();
async function completedRatio(page) {
  const text = await requirementText(page);
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? { completed: Number(match[1]), total: Number(match[2]) } : null;
}

test('a completed lesson is reflected in refreshed progress', async t => {
  const harness = await coursePage(t, { completed: ['lesson-1'] });
  const { page } = harness;

  assert.deepEqual(await completedRatio(page), { completed: 1, total: 6 }, 'starts at 1 of 6');
  assert.equal(await percentText(page), '17%');

  await harness.openLesson(0, 1);
  await page.locator('#btn-mark-complete').click();
  await page.waitForFunction(() => document.getElementById('progress-percent')?.textContent === '33%');

  assert.deepEqual(harness.completeRequests, ['lesson-2'], 'the completed lesson id is sent');
  assert.deepEqual(await completedRatio(page), { completed: 2, total: 6 },
    'the requirement summary uses the refreshed count');
  assert.equal(await percentText(page), '33%', 'the progress bar uses the refreshed count');

  // And it survives a reload, i.e. it was really persisted server side.
  await harness.reload();
  assert.deepEqual(await completedRatio(page), { completed: 2, total: 6 }, 'the completion is still counted after reload');
  assert.match(await page.locator('.lesson-item[data-lesson-id="lesson-2"]').getAttribute('class'), /completed/);
});

test('the completion count agrees with the authoritative required-lesson list', async t => {
  // One lesson short: the page must say so and name the remaining requirement.
  const all = ALL_LESSON_IDS;
  const missing = all[all.length - 1];
  const harness = await coursePage(t, { completed: all.filter(id => id !== missing) });
  const { page } = harness;

  assert.deepEqual(await completedRatio(page), { completed: 5, total: 6 },
    'the counter matches the authoritative server summary');
  assert.equal((await page.locator('.module-section').first().locator('.module-progress-label').innerText()).trim(), '4/4 completed');
  assert.match(await page.locator('.module-section').nth(1).locator('.module-progress-label').innerText(), /1\/2 completed/);

  // The outstanding lesson is identified and reachable.
  const continueButton = page.locator('#btn-continue-outstanding');
  await continueButton.waitFor();
  assert.match(await continueButton.innerText(), /Unsupervised Learning/i,
    'the call to action names the outstanding lesson');

  await continueButton.click();
  await page.locator('#lesson-actions').waitFor();
  assert.match(page.url(), /module=1&lesson=1/, 'the link opens the outstanding lesson');
  assert.equal(await page.locator('#lesson-completion-state').count(), 0, 'the outstanding lesson is not shown as completed');
  assert.match(await page.locator('#btn-mark-complete').innerText(), /Mark as Complete/i,
    'the outstanding lesson offers a real completion action');

  assert.equal(await page.locator('a[href^="exam.html"]').count(), 0,
    'no exam call to action while a required lesson remains');
});

test('the exam call to action appears once every required lesson is complete', async t => {
  const harness = await coursePage(t, { completed: ALL_LESSON_IDS });
  const { page } = harness;

  assert.match(await percentText(page), /^100%$/, 'the progress bar reads complete');
  assert.equal(await page.locator('#btn-continue-outstanding').count(), 0,
    'there is nothing left to continue');

  const examCta = page.locator('#btn-take-final-exam');
  await examCta.waitFor();
  assert.equal(await examCta.getAttribute('href'), 'exam.html?id=exam-1',
    'the CTA uses the real exam route and the real exam id');
  assert.match(await requirementText(page), /Take Final Exam/i);
  assert.match(await requirementText(page), /Course complete/i);

  // Reachable without leaving the page or logging out.
  const box = await examCta.boundingBox();
  assert.ok(box.height >= 44, `the exam CTA is a comfortable tap target (${box && box.height})`);
});

test('a course with no configured final exam never promises a certificate', async t => {
  const harness = await coursePage(t, { completed: ALL_LESSON_IDS, exam: false });
  const { page } = harness;
  await page.locator('#exam-button-container [role="status"]').nth(1).waitFor();
  assert.equal(await page.locator('a[href^="exam.html"]').count(), 0,
    'no exam link without a configured exam');
  assert.match(await page.locator('#exam-button-container').innerText(), /No final exam has been configured/i);
});

test('a failed lesson-completion request never shows false success', async t => {
  const harness = await coursePage(t, { completed: ['lesson-1'], completeFails: true });
  const { page } = harness;

  await harness.openLesson(0, 1);
  await page.locator('#btn-mark-complete').click();
  const failure = page.locator('#lesson-completion-feedback');
  await failure.waitFor();

  assert.equal(await failure.getAttribute('role'), 'alert', 'the failure is announced as an error');
  assert.match(await failure.innerText(), /Could not mark this lesson complete/i);
  assert.deepEqual(await completedRatio(page), { completed: 1, total: 6 },
    'the requirement count is not advanced by a failed request');
  assert.equal(await percentText(page), '17%', 'progress is not advanced by a failed request');
  assert.equal(await page.locator('#lesson-completion-state').count(), 0,
    'the lesson is not marked complete in the UI');

  await harness.reload();
  assert.deepEqual(await completedRatio(page), { completed: 1, total: 6 }, 'a reload still shows the server truth');
  assert.equal(await page.locator('#btn-continue-outstanding').count(), 1,
    'the outstanding lesson is still offered after a failed attempt');
});

test('curriculum heading and completion indicator stay inside their card', async t => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const { page, context } = await coursePage(t, { width, height: 900, completed: ALL_LESSON_IDS.slice(0, 5) });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    assert.ok(overflow, `no horizontal page overflow at ${width}px`);

    const escaped = await page.evaluate(() => {
      const problems = [];
      document.querySelectorAll('.module-section').forEach((section, sectionIndex) => {
        const summary = section.querySelector('summary.module-title');
        const bounds = section.getBoundingClientRect();
        summary.querySelectorAll('span').forEach(span => {
          const rect = span.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          if (rect.right > bounds.right + 1 || rect.left < bounds.left - 1) {
            problems.push(`module ${sectionIndex}: "${span.textContent.trim().slice(0, 24)}" [${Math.round(rect.left)}..${Math.round(rect.right)}] vs card [${Math.round(bounds.left)}..${Math.round(bounds.right)}]`);
          }
        });
      });
      return problems;
    });
    assert.deepEqual(escaped, [], `curriculum summary content stays inside the card at ${width}px`);

    // The indicator must remain readable, not clipped to nothing.
    const label = await page.locator('.module-section').nth(1).locator('.module-progress-label').innerText();
    assert.match(label.trim(), /^\d+\/\d+ completed$/, `the completion indicator reads correctly at ${width}px`);
    assert.ok(await page.locator('.module-section').nth(1).locator('.module-progress-label').isVisible(),
      `the completion indicator is visible at ${width}px`);

    await context.close();
  }
});

test('server-side final-exam eligibility is still enforced independently of the page', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const start = source.indexOf('async function checkExamEligibility');
  assert.ok(start > 0, 'the server still owns exam eligibility');
  const body = source.slice(start, source.indexOf('async function submitExamAttemptAuthoritatively'));
  assert.match(body, /from\('enrollments'\)/, 'eligibility requires an enrollment');
  assert.match(body, /Enroll in this course before starting its exam\./);
  assert.match(body, /getProgressSummary\(userId, exam\.course_id\)/,
    'eligibility is computed from the authoritative progress summary');
  assert.match(body, /if \(progress\.completedLessons < progress\.totalLessons\)/,
    'eligibility requires every lesson to be complete');
  assert.match(body, /Complete all course lessons before starting the final exam\./);

  // The route that calls it must be authenticated.
  const startRoute = source.indexOf("app.post('/api/exams/:examId/start'");
  assert.ok(startRoute > 0);
  assert.match(source.slice(startRoute, startRoute + 120), /authenticateToken/,
    'starting an exam still requires authentication');
});

test('the course page still performs no enrollment, exam or certificate writes', async t => {
  const writes = [];
  const harness = await coursePage(t, { completed: ['lesson-1'] });
  const { page, context } = harness;
  page.on('request', request => {
    if (/\/api\/(enroll|exams|certificate)/.test(request.url()) && request.method() !== 'GET') {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  await harness.openLesson(0, 1);
  await page.locator('#btn-mark-complete').click();
  await page.waitForFunction(() => document.getElementById('progress-percent')?.textContent === '33%');
  assert.deepEqual(writes, [], 'completing a lesson must not enroll, start an exam or issue a certificate');
  await context.close();
});