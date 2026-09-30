const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createAdminRouter } = require('../admin-api');

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEARNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NORMAL_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SERVICE_SECRET = 'SERVICE_ROLE_TEST_SECRET_NEVER_RETURN';
const ADMIN_GET_PATHS = [
  'overview',
  'users',
  `users/${LEARNER_ID}`,
  'assessments',
  'progress',
  'exams',
  'certificates',
  'analytics'
];

function fixture() {
  const authUsers = [
    { id: ADMIN_ID, email: 'admin@example.test', created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-09-01T00:00:00Z', user_metadata: { full_name: 'Admin User' } },
    { id: LEARNER_ID, email: 'learner@example.test', created_at: '2026-02-01T00:00:00Z', last_sign_in_at: '2026-09-02T00:00:00Z', user_metadata: { full_name: 'Learner User' } },
    { id: NORMAL_ID, email: 'normal@example.test', created_at: '2026-03-01T00:00:00Z', last_sign_in_at: null, user_metadata: { full_name: 'Normal User' } }
  ];
  const tables = {
    admin_users: [{ user_id: ADMIN_ID }],
    users: [
      { id: LEARNER_ID, full_name: 'Learner User', career_goal: 'Software Developer', created_at: '2026-02-01T00:00:00Z' },
      { id: NORMAL_ID, full_name: 'Normal User', career_goal: 'undecided', created_at: '2026-03-01T00:00:00Z' }
    ],
    career_test_attempts: [
      { id: 'attempt-1', user_id: LEARNER_ID, top_careers: [{ career: 'Software Developer', score: 82 }], score_data: { assessment_version: 'career-profile-v1', dimension_scores: { 'Software Engineering': 0.8, HIDDEN: 'do not expose' }, strengths: ['Strong Software Engineering orientation'], private_result: 'do not expose' }, answers: { secret: 'raw answer' }, completed: true, created_at: '2026-04-01T00:00:00Z' },
      { id: 'attempt-2', user_id: LEARNER_ID, top_careers: [{ career: 'Data Analyst', score: 78 }], score_data: { assessment_version: 'career-profile-v1', dimension_scores: { 'Data & Analytical Thinking': 0.9 }, strengths: ['Strong Data orientation'] }, answers: { secret: 'raw answer 2' }, completed: true, created_at: '2026-05-01T00:00:00Z' }
    ],
    enrollments: [{ id: 'enrollment-1', user_id: LEARNER_ID, course_id: 'python_for_careers', course_name: 'Python for Career Development', enrolled_at: '2026-05-02T00:00:00Z', progress: 1 }],
    modules: [{ id: 'module-1', course_id: 'python_for_careers', module_order: 1 }],
    lessons: [
      { id: 'lesson-1', module_id: 'module-1', title: 'First lesson', lesson_order: 1 },
      { id: 'lesson-2', module_id: 'module-1', title: 'Second lesson', lesson_order: 2 },
      { id: 'lesson-3', module_id: 'module-1', title: 'Third lesson', lesson_order: 3 }
    ],
    lesson_progress: [
      { user_id: LEARNER_ID, lesson_id: 'lesson-1', completed: true },
      { user_id: LEARNER_ID, lesson_id: 'lesson-2', completed: true }
    ],
    exams: [{ id: 'exam-1', course_id: 'python_for_careers', title: 'Final Exam', answer_key: 'secret' }],
    exam_attempts: [{ id: 'exam-attempt-1', user_id: LEARNER_ID, exam_id: 'exam-1', attempt_number: 1, score: 88, passed: true, started_at: '2026-06-01T00:00:00Z', submitted_at: '2026-06-01T01:00:00Z', answers: ['secret'], selected_question_ids: ['secret'], result_data: { raw: 'secret' } }],
    certificates: [{ id: 'certificate-1', user_id: LEARNER_ID, course_id: 'python_for_careers', course_name: 'Python for Career Development', earned_at: '2026-06-02T00:00:00Z', private_field: 'secret' }]
  };
  const queries = [];
  const ranges = [];

  class Query {
    constructor(table) { this.table = table; this.filters = []; this.selection = '*'; this.options = {}; this.start = 0; this.end = Infinity; this.limitValue = Infinity; this.sort = null; queries.push(table); }
    select(selection, options = {}) { this.selection = selection; this.options = options; return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    ilike(key, value) { const needle = value.replace(/^%|%$/g, '').toLowerCase(); this.filters.push(row => String(row[key] || '').toLowerCase().includes(needle)); return this; }
    gte(key, value) { this.filters.push(row => row[key] >= value); return this; }
    lte(key, value) { this.filters.push(row => row[key] <= value); return this; }
    filter(key, operator, value) { this.filters.push(row => operator === 'eq' && row.score_data?.assessment_version === value); return this; }
    order(key, options = {}) { this.sort = [key, options.ascending !== false]; return this; }
    range(start, end) { ranges.push({ table: this.table, start, end }); this.start = start; this.end = end; return this; }
    limit(value) { this.limitValue = value; return this; }
    async maybeSingle() { const result = await this.execute(); return { data: result.data?.[0] || null, error: null }; }
    async single() { const result = await this.execute(); return { data: result.data?.[0] || null, error: null }; }
    async execute() {
      let rows = [...(tables[this.table] || [])].filter(row => this.filters.every(fn => fn(row)));
      const count = rows.length;
      if (this.sort) rows.sort((a, b) => String(a[this.sort[0]] || '').localeCompare(String(b[this.sort[0]] || '')) * (this.sort[1] ? 1 : -1));
      if (this.options.head) return { data: null, count, error: null };
      rows = rows.slice(this.start, Math.min(this.end + 1, this.start + this.limitValue));
      if (this.selection !== '*') {
        const fields = [...new Set(this.selection.split(',').map(field => field.trim().split(':').pop()))];
        rows = rows.map(row => Object.fromEntries(fields.filter(field => Object.hasOwn(row, field)).map(field => [field, row[field]])));
      }
      return { data: rows, count: this.options.count ? count : null, error: null };
    }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
  }

  const supabase = {
    from: table => new Query(table),
    auth: { admin: {
      getUserById: async id => ({ data: { user: authUsers.find(user => user.id === id) || null }, error: null }),
      listUsers: async ({ page = 1, perPage = 50 } = {}) => ({ data: {
        users: authUsers.slice((page - 1) * perPage, page * perPage), total: authUsers.length
      }, error: null })
    } }
  };
  const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const user = ({ admin: authUsers[0], learner: authUsers[1], normal: authUsers[2] })[token];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = { id: user.id, email: user.email, name: user.user_metadata.full_name };
    return next();
  };
  return { supabase, authenticateToken, queries, ranges };
}

async function withApi(run) {
  const f = fixture();
  const app = express();
  app.use('/api/admin', createAdminRouter({ supabase: f.supabase, authenticateToken: f.authenticateToken }));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`, f); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('unauthenticated and invalid tokens are rejected before admin data queries', async () => {
  await withApi(async (base, f) => {
    assert.equal((await fetch(`${base}/api/admin/overview`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/overview`, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
    assert.deepEqual(f.queries, []);
  });
});

test('authenticated non-admin is denied before another user journey is queried', async () => {
  await withApi(async (base, f) => {
    const response = await fetch(`${base}/api/admin/users/${LEARNER_ID}`, { headers: { Authorization: 'Bearer normal' } });
    assert.equal(response.status, 403);
    assert.deepEqual(f.queries, ['admin_users']);
    assert.doesNotMatch(await response.text(), new RegExp(LEARNER_ID));
  });
});

test('every admin endpoint enforces anonymous, invalid-token, learner, and admin states', async () => {
  await withApi(async (base, f) => {
    for (const path of ADMIN_GET_PATHS) {
      const url = `${base}/api/admin/${path}`;
      assert.equal((await fetch(url)).status, 401, `${path}: anonymous`);
      assert.equal((await fetch(url, { headers: { Authorization: 'Bearer invalid' } })).status, 401, `${path}: invalid token`);
      for (const fakeFlags of ['?is_admin=true', '?role=admin', '?is_admin=true&role=admin']) {
        const learner = await fetch(`${url}${fakeFlags}`, { headers: { Authorization: 'Bearer normal' } });
        assert.equal(learner.status, 403, `${path}: learner-controlled role flags ${fakeFlags}`);
      }
    }
    assert.ok(f.queries.length > 0);
    assert.ok(f.queries.every(table => table === 'admin_users'), 'denied requests must stop before target/admin data queries');

    for (const path of ADMIN_GET_PATHS) {
      const response = await fetch(`${base}/api/admin/${path}`, { headers: { Authorization: 'Bearer admin' } });
      assert.equal(response.status, 200, `${path}: authorized admin`);
    }
  });
});

test('admin can read another user journey with safe fields and derived progress', async () => {
  await withApi(async base => {
    const response = await fetch(`${base}/api/admin/users/${LEARNER_ID}`, { headers: { Authorization: 'Bearer admin' } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.assessments.length, 2);
    assert.deepEqual(body.assessments.map(a => [a.attemptNumber, a.isRetest]), [[1, false], [2, true]]);
    assert.equal(body.careerProfile.attemptId, 'attempt-2');
    assert.equal(body.courses[0].progressPercent, 67);
    assert.equal(body.courses[0].lessonsCompleted, 2);
    assert.equal(body.courses[0].totalLessons, 3);
    assert.equal(body.courses[0].nextLesson.label, 'Next incomplete lesson');
    assert.equal(body.courses[0].nextLesson.title, 'Third lesson');
    assert.equal(body.exams[0].score, 88);
    assert.equal(body.certificates[0].certificateId, 'certificate-1');
    const serialized = JSON.stringify(body);
    for (const secret of ['raw answer', 'answer_key', 'selected_question_ids', 'result_data', 'private_field', SERVICE_SECRET]) {
      assert.equal(serialized.includes(secret), false, `response leaked ${secret}`);
    }
  });
});

test('assessment, exam, and certificate lists exclude answer-bearing columns', async () => {
  await withApi(async base => {
    const headers = { Authorization: 'Bearer admin' };
    const [assessments, exams, certificates] = await Promise.all([
      fetch(`${base}/api/admin/assessments`, { headers }).then(r => r.json()),
      fetch(`${base}/api/admin/exams`, { headers }).then(r => r.json()),
      fetch(`${base}/api/admin/certificates`, { headers }).then(r => r.json())
    ]);
    const body = JSON.stringify({ assessments, exams, certificates });
    for (const secret of ['raw answer', 'answer_key', 'selected_question_ids', 'result_data', 'private_field', SERVICE_SECRET]) {
      assert.equal(body.includes(secret), false, `list response leaked ${secret}`);
    }
  });
});

test('pagination is capped and invalid user UUIDs are rejected', async () => {
  await withApi(async base => {
    const headers = { Authorization: 'Bearer admin' };
    const page = await fetch(`${base}/api/admin/users?perPage=500`, { headers }).then(r => r.json());
    assert.equal(page.perPage, 100);
    const invalid = await fetch(`${base}/api/admin/users/not-a-uuid`, { headers });
    assert.equal(invalid.status, 400);
  });
});

test('course-filtered exam lookup uses the bounded aggregation page size', async () => {
  await withApi(async (base, f) => {
    const response = await fetch(`${base}/api/admin/exams?courseId=python_for_careers`, {
      headers: { Authorization: 'Bearer admin' }
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).attempts.length, 1);
    assert.ok(f.ranges.some(range => range.table === 'exams' && range.start === 0 && range.end === 499));
  });
});

test('admin authorization fails closed when the membership table is unavailable', async () => {
  const app = express();
  const supabase = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: '42P01' } }) }) }) })
  };
  app.use('/api/admin', createAdminRouter({ supabase, authenticateToken: (req, _res, next) => { req.user = { id: ADMIN_ID }; next(); } }));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/overview`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Admin authorization is unavailable' });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('admin authorization fails closed when membership lookup throws', async () => {
  const app = express();
  const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('database unavailable'); } }) }) }) };
  app.use('/api/admin', createAdminRouter({ supabase, authenticateToken: (req, _res, next) => { req.user = { id: ADMIN_ID }; next(); } }));
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/overview`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Admin authorization is unavailable' });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('frontend contains no service-role credential and admin migration grants no browser membership access', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const publicRoot = path.join(__dirname, '..', 'public');
  const frontendFiles = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(?:html|js|css|json)$/i.test(entry.name)) frontendFiles.push(target);
    }
  }
  walk(publicRoot);
  for (const file of frontendFiles) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /SERVICE_ROLE_TEST_SECRET_NEVER_RETURN/);
    assert.doesNotMatch(text, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`][^"'`]+/i);
    assert.doesNotMatch(text, /service_role\s*:\s*["'`][^"'`]+/i);
  }
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '20260930_admin_users.sql'), 'utf8');
  assert.match(migration, /REFERENCES\s+auth\.users\s*\(id\)/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.admin_users FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT, INSERT, DELETE ON TABLE public\.admin_users TO service_role/i);
  assert.doesNotMatch(migration, /CREATE POLICY/i);
  assert.doesNotMatch(migration, /UPDATE public\.admin_users|DELETE FROM public\.admin_users|DROP TABLE/i);
});
