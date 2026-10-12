const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const courseCatalog = require('../course-catalog-config.json');

const dimensions = [
  'Software Engineering',
  'Data & Analytical Thinking',
  'AI & Computational Intelligence',
  'Systems & Infrastructure',
  'Security & Reliability',
  'Product & User Orientation',
  'Design & Human Experience',
  'Leadership & Delivery'
];

async function startFixture(t) {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  });
  return { browser, origin: `http://127.0.0.1:${server.address().port}` };
}

function assessmentResult(career) {
  return {
    assessment_version: 'career-profile-v1',
    top_careers: [
      { career, score: 91.27 },
      { career: 'Data Analyst', score: 80.55 },
      { career: 'Product Manager', score: 73.12 }
    ],
    dimension_scores: Object.fromEntries(dimensions.map((dimension, index) => [dimension, (8 - index) / 8])),
    strengths: ['Strong Software Engineering orientation', 'Strong Data & Analytical Thinking orientation', 'Strong AI & Computational Intelligence orientation']
  };
}

async function openResult(browser, origin, career, language = 'en', options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(({ selectedLanguage, draft }) => {
    localStorage.setItem('aicareer-language', selectedLanguage);
    if (draft) sessionStorage.setItem('cs-career-v2-attempt', JSON.stringify(draft));
    const session = { access_token: 'career-result-test-token', user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } };
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getUser: async () => ({ data: { user: session.user }, error: null })
    } };
  }, { selectedLanguage: language, draft: options.draft });
  await context.route('**/*', route => {
    const hostname = new URL(route.request().url()).hostname;
    return hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/questions') {
      const categories = [...dimensions, dimensions[0]];
      const questions = Array.from({ length: 25 }, (_, index) => ({
        id: `retake-question-${index + 1}`, text: `Question ${index + 1}`,
        category: categories[index % categories.length],
        options: [1, 2, 3, 4, 5].map(value => ({ value, text: String(value) }))
      }));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(questions) });
    }
    if (path === '/api/career-test') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: assessmentResult(career) }) });
    }
    if (path === '/api/courses') {
      if (options.courses) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ courses: options.courses }) });
      // Exercise the repository-backed result UI while the status-dependent
      // catalog route is unavailable. Course IDs/titles/descriptions still
      // come from the checked-in mapping and localized course metadata.
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Course status schema unavailable' }) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  await page.goto(`${origin}/career-test.html${options.query || ''}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#results-container').waitFor({ state: 'visible' });
  await page.locator('.career-course-step').first().waitFor({ state: 'visible' });
  return { context, page };
}

test('career result keeps the conclusion first and maps real courses for the supported profiles', async t => {
  const source = require('node:fs').readFileSync('public/career-test.js', 'utf8');
  const localMapping = source.match(/const careerCourseIds = (\{[\s\S]*?\n  \});/);
  assert.ok(localMapping, 'the result presentation exposes its repository-backed mapping');
  assert.deepEqual(Function(`return (${localMapping[1].replace(/;$/, '')})`)(), courseCatalog.careerCourseMapping);
  assert.deepEqual(courseCatalog.learningPathOrder, courseCatalog.careerCourseMapping);

  const { browser, origin } = await startFixture(t);
  const cases = [
    ['AI/ML Engineer', 'AI & Machine Learning'],
    ['Software Developer', 'Software Development'],
    ['Data Scientist', 'Data Science & Analytics'],
    ['Data Analyst', 'Data Science & Analytics'],
    ['UI/UX Designer', 'Design & User Experience']
  ];

  for (const [career, expectedDomain] of cases) {
    const { context, page } = await openResult(browser, origin, career);
    try {
      assert.equal(await page.locator('.career-result-domain').innerText(), expectedDomain);
      assert.equal(await page.locator('.career-result-section h2').first().innerText(), 'What we noticed');
      assert.equal(await page.locator('.career-result-section h2').nth(1).innerText(), 'Start learning');
      assert.equal(await page.locator('.career-result-section > ul > li').count(), 3);
      const courseCount = await page.locator('.career-course-step').count();
      assert.ok(courseCount >= 3 && courseCount <= 5, `${career} should show three to five locally described courses when the API is unavailable`);
      assert.equal(await page.locator('.career-assessment-detail').getAttribute('open'), null);
      const detailedAssessment = await page.locator('.career-assessment-detail').evaluate(element => element.textContent);
      assert.match(detailedAssessment, /Dimension scores/);
      assert.match(detailedAssessment, /Detailed career results/);
      assert.match(detailedAssessment, /How this result is calculated/);
      assert.match(detailedAssessment, new RegExp(career.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.equal(await page.locator('.career-course-step a').count(), 0, 'unknown availability must not imply that a course is ready to start');
      const resultText = await page.locator('#results-content').innerText();
      assert.doesNotMatch(resultText, /(?:courseMetadata|courses)\.[\w-]+\.(?:title|description)/i, 'missing course metadata never leaks a translation key');
      assert.doesNotMatch(resultText, /coming soon|available now/i, 'unknown availability makes no availability claim');
      assert.doesNotMatch(resultText, /winner|confidence|similarity/i);
      assert.equal(await page.locator('#results-content').innerText().then(text => /\b\d+(?:\.\d+)?%/.test(text)), false, 'percentages stay inside collapsed details');
      for (const card of await page.locator('.career-course-step').all()) {
        assert.ok((await card.locator('h3').innerText()).trim());
        assert.ok((await card.locator('p').first().innerText()).trim());
      }

      const links = await page.locator('.career-course-step a').evaluateAll(anchors => anchors.map(anchor => ({ href: anchor.getAttribute('href'), text: anchor.innerText, description: anchor.parentElement.querySelector('p')?.innerText })));
      const mappedIds = courseCatalog.careerCourseMapping[career];
      for (const link of links) {
        const courseId = new URL(link.href, origin).searchParams.get('id');
        assert.ok(mappedIds.includes(courseId), `${career} recommendation uses mapped course ID ${courseId}`);
        assert.ok(courseCatalog.courseCategories[courseId], `${courseId} exists in the checked-in catalog configuration`);
        assert.match(link.href, /^course-detail\.html\?id=[a-z0-9_-]+$/);
        assert.ok(link.description && link.description.length > 12, `${courseId} has its existing catalog description`);
      }
      assert.deepEqual(links, []);
    } finally {
      await context.close();
    }
  }
});

test('API course copy takes precedence over localized fallback metadata', async t => {
  const { browser, origin } = await startFixture(t);
  const { context, page } = await openResult(browser, origin, 'Software Developer', 'en', { courses: [
    { id: 'vibe_coding', title: 'Authoritative API Course Title', description: 'Authoritative API course description.', status: 'available' }
  ] });
  try {
    const card = page.locator('.career-course-step').filter({ has: page.locator('a[href="course-detail.html?id=vibe_coding"]') });
    await card.waitFor({ state: 'visible' });
    assert.equal(await card.locator('h3').innerText(), 'Authoritative API Course Title');
    assert.equal(await card.locator('p').first().innerText(), 'Authoritative API course description.');
    assert.equal(await card.locator('a').count(), 1);
    assert.doesNotMatch(await card.innerText(), /(?:courseMetadata|courses)\.[\w-]+\.(?:title|description)/i);
  } finally {
    await context.close();
  }
});

test('explicit result view bypasses but preserves an unfinished retake draft', async t => {
  const { browser, origin } = await startFixture(t);
  const draft = { version: 'cs-career-v2', questionIds: ['draft-question'], answers: { 'draft-question': 4 }, currentQuestion: 0 };
  const { context, page } = await openResult(browser, origin, 'Data Scientist', 'en', { draft, query: '?view=result' });
  try {
    await page.locator('#results-container').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.career-result-domain').innerText(), 'Data Science & Analytics');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('cs-career-v2-attempt')).answers['draft-question']), 4);

    await page.locator('#retake-btn').click();
    await page.locator('#quiz-container').waitFor({ state: 'visible' });
    await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('cs-career-v2-attempt') || 'null')?.questionIds?.length > 0);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('cs-career-v2-attempt')).questionIds.includes('draft-question')), false, 'the explicit retake action starts a new attempt while preserving normal retake entry');
    assert.equal(new URL(page.url()).searchParams.has('view'), false);
  } finally { await context.close(); }
});

test('course recommendation actions follow explicit availability and omit missing courses', async t => {
  const { browser, origin } = await startFixture(t);
  const { context, page } = await openResult(browser, origin, 'AI/ML Engineer', 'en', { courses: [
    { id: 'intro_to_ai', title: 'Introduction to AI', description: 'Course description.', status: 'available' },
    { id: 'python_for_careers', title: 'Python for Careers', description: 'Course description.', status: 'coming_soon' },
    { id: 'advanced_ml', title: 'Advanced Machine Learning', description: 'Course description.' }
  ] });
  try {
    await page.waitForFunction(() => document.querySelector('.career-course-step a[href*="intro_to_ai"]'));
    await page.waitForFunction(() => document.querySelector('.career-course-list')?.innerText.includes('Coming soon'));
    const available = page.locator('.career-course-step').filter({ has: page.locator('a[href="course-detail.html?id=intro_to_ai"]') });
    const coming = page.locator('.career-course-step').filter({ hasText: 'Coming soon' });
    const unknown = page.locator('.career-course-step').filter({ hasText: 'Advanced Machine Learning' });
    assert.equal(await available.locator('a').count(), 1);
    assert.match(await coming.innerText(), /Coming soon/i);
    assert.equal(await coming.locator('a').count(), 0);
    assert.equal(await unknown.locator('a').count(), 0);
    assert.equal(await page.locator('.career-course-step').count(), 3, 'a course missing from the returned catalog is omitted');
  } finally { await context.close(); }
});

test('saved assessment absence is distinct from assessment read failure', async t => {
  const { browser, origin } = await startFixture(t);
  const dimensionsForQuestions = [...dimensions, dimensions[0]];

  async function openQuiz(savedResult) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('aicareer-language', 'en');
      localStorage.removeItem('token');
      sessionStorage.clear();
      const session = { access_token: 'career-result-test-token', user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } };
      window.supabase = { auth: {
        getSession: async () => ({ data: { session }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getUser: async () => ({ data: { user: session.user }, error: null })
      } };
    });
    await context.route('**/*', route => {
      const hostname = new URL(route.request().url()).hostname;
      return hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    let questionRequests = 0;
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/career-test') return route.fulfill({
        status: savedResult.status, contentType: 'application/json',
        body: JSON.stringify(savedResult.body)
      });
      if (path === '/api/questions') {
        questionRequests++;
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify(Array.from({ length: 25 }, (_, index) => ({
            id: `question-${index + 1}`, text: `Question ${index + 1}`,
            category: dimensionsForQuestions[index % dimensionsForQuestions.length],
            options: [1, 2, 3, 4, 5].map(value => ({ value, text: String(value) }))
          })))
        });
      }
      if (path === '/api/dashboard') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (path === '/api/courses') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"courses":[]}' });
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    await page.goto(`${origin}/career-test.html`, { waitUntil: 'domcontentloaded' });
    return { context, page, getQuestionRequests: () => questionRequests };
  }

  const noResult = await openQuiz({ status: 404, body: { error: 'NO_COMPLETED_CAREER_ASSESSMENT' } });
  try {
    await noResult.page.locator('#options-container .answer-choice').first().waitFor();
    assert.equal(noResult.getQuestionRequests(), 1, 'an explicit no-result response starts a new assessment');
  } finally {
    await noResult.context.close();
  }

  const readFailure = await openQuiz({ status: 500, body: { error: 'CAREER_ASSESSMENT_READ_FAILED' } });
  try {
    await readFailure.page.waitForURL('**/dashboard.html');
    assert.equal(readFailure.getQuestionRequests(), 0, 'a failed saved-result read is not misreported as a new assessment');
  } finally {
    await readFailure.context.close();
  }
});

test('Dashboard and Career Result share broad-domain mappings for supported roles', async t => {
  const { browser, origin } = await startFixture(t);
  const cases = [
    ['Data Scientist', 'Data Science & Analytics'], ['Data Analyst', 'Data Science & Analytics'],
    ['AI/ML Engineer', 'AI & Machine Learning'], ['Software Developer', 'Software Development'],
    ['UI/UX Designer', 'Design & User Experience']
  ];
  for (const [career, expected] of cases) {
    const result = await openResult(browser, origin, career);
    try { assert.equal(await result.page.locator('.career-result-domain').innerText(), expected); }
    finally { await result.context.close(); }

    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('aicareer-language', 'en');
      const session = { access_token: 'career-result-test-token', user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } };
      window.supabase = { auth: { getSession: async () => ({ data: { session }, error: null }), getUser: async () => ({ data: { user: session.user }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } };
    });
    await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await context.route('**/api/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { name: 'Asha' }, careerTest: { completed: true, assessmentVersion: 'career-profile-v1', topCareers: [{ career }], dimensionScores: {} }, enrollments: [], certificates: [] }) }));
    await context.route('**/api/courses', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    const dashboard = await context.newPage();
    await dashboard.goto(`${origin}/dashboard.html`, { waitUntil: 'domcontentloaded' });
    await dashboard.locator('#career-summary .insight-direction h3').waitFor();
    assert.equal(await dashboard.locator('#career-summary .insight-direction h3').innerText(), expected, `${career} has the same Dashboard domain`);
    await context.close();
  }
});

test('career result remains localized and has no horizontal overflow at required widths including Arabic RTL', async t => {
  const { browser, origin } = await startFixture(t);
  const widths = [320, 375, 390, 430, 768, 1024, 1440];
  const languages = [
    ['en', 'What we noticed', 'Start learning'],
    ['fr', 'Ce que nous avons remarqué', 'Commencer à apprendre'],
    ['hinglish', 'Humne kya notice kiya', 'Seekhna shuru karo'],
    ['sw', 'Tulichoona', 'Anza kujifunza'],
    ['ar', 'ما لاحظناه', 'ابدأ التعلّم']
  ];
  const aiDomains = {
    en: 'AI & Machine Learning',
    fr: 'IA et apprentissage automatique',
    hinglish: 'AI aur Machine Learning',
    sw: 'AI na Machine Learning',
    ar: 'الذكاء الاصطناعي وتعلّم الآلة'
  };

  for (const [language, noticed, start] of languages) {
    const { context, page } = await openResult(browser, origin, 'AI/ML Engineer', language);
    try {
      assert.equal(await page.locator('.career-result-section h2').first().innerText(), noticed);
      assert.equal(await page.locator('.career-result-section h2').nth(1).innerText(), start);
      assert.equal(await page.locator('.career-result-domain').innerText(), aiDomains[language]);
      assert.equal(await page.locator('#results-content').innerText().then(text => /careerResult\./.test(text)), false);
      if (language === 'ar') {
        assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
      }
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(30);
        const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
        assert.ok(overflow.document <= overflow.viewport + 1, `${language} has horizontal overflow at ${width}px: ${JSON.stringify(overflow)}`);
      }
    } finally {
      await context.close();
    }
  }
});
