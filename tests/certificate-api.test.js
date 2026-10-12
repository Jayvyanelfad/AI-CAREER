const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createCertificateRouter } = require('../certificate-api');

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === 'string' && UUID_RE.test(value);

function makeDb(state) {
  const seen = { inserts: [], notifications: [] };
  return {
    seen,
    from(table) {
      const filters = [];
      const request = { wantCount: false, fields: null };
      const query = {
        select(fields, options) {
          request.fields = fields;
          if (options && options.count === 'exact' && options.head) request.wantCount = true;
          return query;
        },
        eq(field, value) { filters.push([field, value]); return query; },
        in(field, values) { filters.push([field, values, 'in']); return query; },
        order(field, { ascending }) {
          query._order = [field, ascending]; return query;
        },
        limit(n) { query._limit = n; return query; },
        insert(row) {
          seen.inserts.push({ table, row });
          if (state.failInsert) return { select: () => ({ single: () => Promise.resolve({ data: null, error: state.failInsert }) }) };
          const created = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', earned_at: '2026-03-01T00:00:00Z', ...row };
          state[table].push(created);
          return { select: () => ({ single: () => Promise.resolve({ data: created, error: null }) }) };
        },
        maybeSingle() { return Promise.resolve({ data: first(), error: null }); },
        single() {
          const row = first();
          return Promise.resolve(row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } });
        },
        then(resolve, reject) {
          if (request.wantCount) {
            const examId = (filters.find(([f]) => f === 'exam_id') || [])[1];
            return Promise.resolve({ count: state.questionCounts[examId] ?? 0, error: null }).then(resolve, reject);
          }
          // Emulate a schema without the is_final discriminator.
          if (state.noFinalColumn && request.fields && request.fields.includes('is_final')) {
            return Promise.resolve({ data: null, error: { message: 'column "exams.is_final" does not exist' } }).then(resolve, reject);
          }
          return Promise.resolve({ data: all(), error: null }).then(resolve, reject);
        }
      };
      function all() {
        let rows = (state[table] || []).filter(row => filters.every(([f, v, mode]) => mode === 'in' ? v.includes(row[f]) : row[f] === v));
        if (query._order) {
          const [field, ascending] = query._order;
          rows = [...rows].sort((a, b) => ascending ? a[field] - b[field] : b[field] - a[field]);
        }
        if (query._limit !== undefined) rows = rows.slice(0, query._limit);
        return rows;
      }
      function first() { return all()[0] || null; }
      return query;
    }
  };
}

function baseState() {
  return {
    courses: [{ id: 'intro_to_ai', title: 'Introduction to AI' }],
    enrollments: [{ id: 'e1', user_id: alice, course_id: 'intro_to_ai' }],
    modules: [{ id: 'm1', course_id: 'intro_to_ai' }],
    lessons: [{ id: 'l1', module_id: 'm1' }],
    lesson_progress: [{ user_id: alice, lesson_id: 'l1', completed: true }],
    exams: [{ id: 'final1', course_id: 'intro_to_ai', title: 'Intro Final Exam' }],
    exam_questions: [],
    questionCounts: { final1: 3 },
    exam_attempts: [{ id: 'att1', exam_id: 'final1', user_id: alice, attempt_number: 1, submitted_at: '2026-02-01T00:00:00Z', passed: true }],
    certificates: [],
    users: [{ id: alice, full_name: 'Asha Learner' }],
    failInsert: null
  };
}

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (token === 'Bearer alice') { req.user = { id: alice }; return next(); }
  if (token === 'Bearer bob') { req.user = { id: bob }; return next(); }
  return res.status(401).json({ error: 'Access token required' });
}

const quiet = { log() {}, warn() {}, error() {} };

async function start(t, db, notify) {
  const app = express(); app.use(express.json());
  const createNotification = notify || (async (client, payload) => { db.seen.notifications.push(payload); });
  app.use('/api', createCertificateRouter({ supabase: db, authenticateToken: auth, createNotification, isUuid }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const post = (base, courseId, token, body = {}) => fetch(`${base}/api/certificate/${courseId}/issue`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body)
});

test('eligible learner is issued a certificate', async t => {
  const state = baseState();
  const db = makeDb(state);
  const base = await start(t, db);
  const res = await post(base, 'intro_to_ai', 'alice');
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.certificate.courseId, 'intro_to_ai');
  assert.equal(body.certificate.learnerName, 'Asha Learner');
  assert.equal(body.certificate.status, 'issued');
  assert.equal(state.certificates.length, 1);
  assert.equal(db.seen.notifications.length, 1);
});

test('issuance rejects unenrolled learners, incomplete lessons, and unpassed exams', async t => {
  // Not enrolled (bob).
  {
    const base = await start(t, makeDb(baseState()));
    const res = await post(base, 'intro_to_ai', 'bob');
    assert.equal(res.status, 403);
  }
  // Lessons incomplete.
  {
    const state = baseState();
    state.lesson_progress = [];
    const base = await start(t, makeDb(state));
    assert.equal((await post(base, 'intro_to_ai', 'alice')).status, 409);
  }
  // Latest attempt not passed.
  {
    const state = baseState();
    state.exam_attempts[0].passed = false;
    const base = await start(t, makeDb(state));
    assert.equal((await post(base, 'intro_to_ai', 'alice')).status, 403);
  }
  // No single final exam.
  {
    const state = baseState();
    state.exams = [{ id: 'quiz1', course_id: 'intro_to_ai', title: 'Section Quiz' }];
    state.questionCounts = { quiz1: 2 };
    const base = await start(t, makeDb(state));
    assert.equal((await post(base, 'intro_to_ai', 'alice')).status, 409);
  }
  // Unknown course.
  {
    const base = await start(t, makeDb(baseState()));
    assert.equal((await post(base, 'nope', 'alice')).status, 404);
  }
  // Client-provided result data rejected.
  {
    const base = await start(t, makeDb(baseState()));
    assert.equal((await post(base, 'intro_to_ai', 'alice', { passed: true })).status, 400);
  }
  // Unauthenticated.
  {
    const base = await start(t, makeDb(baseState()));
    assert.equal((await post(base, 'intro_to_ai', null)).status, 401);
  }
});

test('duplicate issuance returns the existing certificate without inserting', async t => {
  const state = baseState();
  state.certificates = [{ id: 'cert-1', user_id: alice, course_id: 'intro_to_ai', course_name: 'Introduction to AI', earned_at: '2026-02-02T00:00:00Z' }];
  const db = makeDb(state);
  const base = await start(t, db);
  const res = await post(base, 'intro_to_ai', 'alice');
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).certificate.certificateId, 'cert-1');
  assert.deepEqual(db.seen.inserts, []);
  assert.equal(state.certificates.length, 1);
});

test('concurrent duplicate insert (23505) recovers to the existing certificate', async t => {
  const state = baseState();
  state.failInsert = { code: '23505', message: 'duplicate key' };
  state.certificates = [{ id: 'cert-9', user_id: alice, course_id: 'intro_to_ai', course_name: 'Introduction to AI', earned_at: '2026-02-02T00:00:00Z' }];
  const base = await start(t, makeDb(state));
  const res = await post(base, 'intro_to_ai', 'alice');
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).certificate.certificateId, 'cert-9');
});

test('certificate still issues when notifications fail', async t => {
  const state = baseState();
  const base = await start(t, makeDb(state), async () => { throw new Error('notifications table missing'); });
  const res = await post(base, 'intro_to_ai', 'alice');
  assert.equal(res.status, 201);
  assert.equal((await res.json()).success, true);
});

test('explicitly flagged final qualifies regardless of title', async t => {
  const state = baseState();
  state.exams = [{ id: 'final1', course_id: 'intro_to_ai', title: 'Capstone Assessment', is_final: true }];
  state.questionCounts = { final1: 3 };
  const base = await start(t, makeDb(state));
  const res = await post(base, 'intro_to_ai', 'alice');
  assert.equal(res.status, 201);
  assert.equal((await res.json()).success, true);
});

test('legacy schema without is_final falls back to the title heuristic', async t => {
  const state = baseState();
  state.noFinalColumn = true;
  const base = await start(t, makeDb(state));
  const res = await post(base, 'intro_to_ai', 'alice');
  assert.equal(res.status, 201);
  assert.equal((await res.json()).success, true);
});

test('final-exam discriminator migration is narrowly scoped', () => {
  const fs = require('node:fs');
  const migration = fs.readFileSync('migrations/20261012_exam_final_discriminator.sql', 'utf8');
  assert.match(migration, /^BEGIN;/m);
  assert.match(migration, /^COMMIT;/m);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(migration, /WHERE id = 'intro_to_ai_exam_1'/);
  assert.doesNotMatch(migration, /DROP TABLE/);
  assert.doesNotMatch(migration, /ALTER TABLE public\.(?!exams)/);
});

test('verification and owned reads keep working', async t => {
  const state = baseState();
  state.certificates = [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', user_id: alice, course_id: 'intro_to_ai', course_name: 'Introduction to AI', earned_at: '2026-02-02T00:00:00Z' }];
  const base = await start(t, makeDb(state));
  // Public verification (no token).
  assert.equal((await fetch(`${base}/api/certificate/verify/cccccccc-cccc-4ccc-8ccc-cccccccccccc`)).status, 200);
  assert.equal((await fetch(`${base}/api/certificate/verify/not-a-uuid`)).status, 400);
  assert.equal((await fetch(`${base}/api/certificate/verify/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`)).status, 404);
  // Owned read by course.
  const own = await fetch(`${base}/api/certificate/intro_to_ai`, { headers: { Authorization: 'Bearer alice' } });
  assert.equal(own.status, 200);
  // Another user's certificate is not visible.
  const foreign = await fetch(`${base}/api/certificate/id/cccccccc-cccc-4ccc-8ccc-cccccccccccc`, { headers: { Authorization: 'Bearer bob' } });
  assert.equal(foreign.status, 404);
});

test('migration removes only the client INSERT path and preserves reads', () => {
  const fs = require('node:fs');
  const migration = fs.readFileSync('migrations/20261012_certificate_revoke_client_insert.sql', 'utf8');
  assert.match(migration, /^BEGIN;/m);
  assert.match(migration, /^COMMIT;/m);
  assert.match(migration, /DROP POLICY IF EXISTS "Users can insert own certificates" ON public\.certificates;/);
  assert.match(migration, /REVOKE INSERT ON TABLE public\.certificates FROM anon, authenticated;/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.certificates TO authenticated;/);
  assert.doesNotMatch(migration, /DROP TABLE/);
  assert.doesNotMatch(migration, /DROP POLICY IF EXISTS "Users can view own certificates"/);
  // Staging base still carries the SELECT policy the migration preserves.
  const step1 = fs.readFileSync('staging_step1.sql', 'utf8');
  assert.match(step1, /CREATE POLICY "Users can view own certificates" ON public\.certificates FOR SELECT/);
});

test('no browser code path inserts certificates directly', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const hits = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.js$/.test(entry.name)) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (/\.from\(['"]certificates['"]\)[\s\S]{0,200}\.insert\(/.test(content)) hits.push(full);
    }
  };
  walk('public');
  assert.deepEqual(hits, []);
  // The sole writer is the server-side issuance route.
  const api = fs.readFileSync('certificate-api.js', 'utf8');
  assert.match(api, /\.from\('certificates'\)\s*\n\s*\.insert\(\{ user_id: userId, course_id: courseId, course_name: course\.title \}\)/);
});
