const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createAdminRouter } = require('../admin-api');

const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ALICE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEMO = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MALLORY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ODD = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

function tablesWithKinds() {
  return {
    admin_users: [{ user_id: ADMIN }],
    users: [
      { id: ALICE, full_name: 'Alice Human', career_goal: 'Engineer', created_at: '2026-01-02T00:00:00Z', account_kind: 'human' },
      { id: BOT, full_name: 'API Test User', career_goal: 'undecided', created_at: '2026-01-03T00:00:00Z', account_kind: 'test' },
      { id: DEMO, full_name: 'Demo Learner', career_goal: 'undecided', created_at: '2026-01-04T00:00:00Z', account_kind: 'demo' },
      { id: MALLORY, full_name: 'Mallory Unknown', career_goal: 'undecided', created_at: '2026-01-05T00:00:00Z' },
      { id: ODD, full_name: 'Odd Entry', career_goal: 'undecided', created_at: '2026-01-06T00:00:00Z', account_kind: 'robot' }
    ],
    career_test_attempts: [
      { id: 'a1', user_id: ALICE, top_careers: [{ career: 'Engineer', score: 90 }], score_data: {}, completed: true, created_at: '2026-02-01T00:00:00Z' },
      { id: 'a2', user_id: BOT, top_careers: [{ career: 'Bot Career', score: 10 }], score_data: {}, completed: true, created_at: '2026-02-02T00:00:00Z' },
      { id: 'a3', user_id: MALLORY, top_careers: [{ career: 'Unknown', score: 50 }], score_data: {}, completed: true, created_at: '2026-02-03T00:00:00Z' }
    ],
    enrollments: [
      { id: 'e1', user_id: ALICE, course_id: 'c1', course_name: 'Course One', enrolled_at: '2026-03-01T00:00:00Z' },
      { id: 'e2', user_id: BOT, course_id: 'c1', course_name: 'Course One', enrolled_at: '2026-03-02T00:00:00Z' }
    ],
    modules: [],
    lessons: [],
    lesson_progress: [],
    exams: [],
    exam_attempts: [],
    courses: [{ id: 'c1', title: 'Course One' }],
    certificates: [{ id: 'cert1', user_id: ALICE, course_id: 'c1', course_name: 'Course One', earned_at: '2026-04-01T00:00:00Z' }]
  };
}

function mockSupabase(tables, { failAccountKind = false } = {}) {
  const authUsers = [
    { id: ADMIN, email: 'admin@example.test', created_at: '2026-01-01T00:00:00Z', last_sign_in_at: null, user_metadata: {} },
    ...tables.users.map(u => ({ id: u.id, email: `${u.id.slice(0, 4)}@example.test`, created_at: u.created_at, last_sign_in_at: null, user_metadata: {} }))
  ];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.selection = '*'; this.options = {}; this.start = 0; this.end = Infinity; this.limitValue = Infinity; this.sort = null; }
    select(selection, options = {}) {
      this.selection = selection; this.options = options;
      if (failAccountKind && selection.includes('account_kind')) this.failKind = true;
      return this;
    }
    eq(k, v) { this.filters.push(r => r[k] === v); return this; }
    in(k, vs) { this.filters.push(r => vs.includes(r[k])); return this; }
    order(k, o = {}) { this.sort = [k, o.ascending !== false]; return this; }
    range(a, b) { this.start = a; this.end = b; return this; }
    limit(v) { this.limitValue = v; return this; }
    async maybeSingle() { const r = await this.execute(); return { data: r.data?.[0] || null, error: r.error }; }
    async execute() {
      if (this.failKind) return { data: null, error: { message: 'column "users.account_kind" does not exist' } };
      let rows = [...(tables[this.table] || [])].filter(r => this.filters.every(fn => fn(r)));
      const count = rows.length;
      if (this.sort) rows.sort((a, b) => String(a[this.sort[0]] || '').localeCompare(String(b[this.sort[0]] || '')) * (this.sort[1] ? 1 : -1));
      if (this.options.head) return { data: null, count, error: null };
      rows = rows.slice(this.start, Math.min(this.end + 1, this.start + this.limitValue));
      if (this.selection !== '*') {
        const fields = [...new Set(this.selection.split(',').map(f => f.trim().split(':').pop()))];
        rows = rows.map(r => Object.fromEntries(fields.filter(f => Object.hasOwn(r, f)).map(f => [f, r[f]])));
      }
      return { data: rows, count: this.options.count ? count : null, error: null };
    }
    then(res, rej) { return this.execute().then(res, rej); }
  }
  return {
    from: t => new Query(t),
    auth: { admin: {
      getUserById: async id => ({ data: { user: authUsers.find(u => u.id === id) || null }, error: null }),
      listUsers: async ({ page = 1, perPage = 50 } = {}) => ({ data: { users: authUsers.slice((page - 1) * perPage, page * perPage), total: authUsers.length }, error: null })
    } }
  };
}

const authAsAdmin = (req, res, next) => { req.user = { id: ADMIN }; return next(); };

async function start(t, supabase) {
  const app = express();
  app.use('/api/admin', createAdminRouter({ supabase, authenticateToken: authAsAdmin }));
  const server = createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => server.close(r)));
  return `http://127.0.0.1:${server.address().port}/api/admin`;
}

const get = (base, path) => fetch(`${base}${path}`).then(async r => ({ status: r.status, body: await r.json() }));

test('overview reports honest human metrics without inferring kinds', async t => {
  const base = await start(t, mockSupabase(tablesWithKinds()));
  const { status, body } = await get(base, '/overview');
  assert.equal(status, 200);
  assert.equal(body.humanUsers, 1);
  assert.equal(body.testAccounts, 1);
  assert.equal(body.demoAccounts, 1);
  assert.equal(body.unclassifiedUsers, 2);
  assert.equal(body.humanCompletedAssessmentAttempts, 1);
  assert.equal(body.usersWithCompletedHumanAssessment, 1);
  assert.equal(body.completedAssessmentAttempts, 3);
  assert.match(body.definitions.humanUsers, /never counted here|explicitly/);
});

test('users kind filter isolates cohorts and rejects unknown kinds', async t => {
  const base = await start(t, mockSupabase(tablesWithKinds()));
  const human = await get(base, '/users?kind=human');
  assert.equal(human.status, 200);
  assert.deepEqual(human.body.users.map(u => u.id), [ALICE]);
  assert.equal(human.body.total, 1);
  const testAccts = await get(base, '/users?kind=test');
  assert.deepEqual(testAccts.body.users.map(u => u.id), [BOT]);
  const all = await get(base, '/users');
  assert.equal(all.body.total, 6);
  assert.equal(all.status, 200);
  const bad = await get(base, '/users?kind=robot');
  assert.equal(bad.status, 400);
});

test('unknown stored kinds surface as unclassified, never human', async t => {
  const base = await start(t, mockSupabase(tablesWithKinds()));
  const { body } = await get(base, '/users');
  const odd = body.users.find(u => u.id === ODD);
  const mallory = body.users.find(u => u.id === MALLORY);
  assert.equal(odd.accountKind, 'unclassified');
  assert.equal(mallory.accountKind, 'unclassified');
  const journey = await get(base, `/users/${ODD}`);
  assert.equal(journey.body.account.accountKind, 'unclassified');
});

test('assessments and analytics scope to human authors on request', async t => {
  const base = await start(t, mockSupabase(tablesWithKinds()));
  const mine = await get(base, '/assessments?kind=human');
  assert.deepEqual(mine.body.attempts.map(a => a.userId), [ALICE]);
  const analytics = await get(base, '/analytics?kind=human');
  assert.equal(analytics.body.kind, 'human');
  assert.deepEqual(analytics.body.careerDirectionDistribution, [{ career: 'Engineer', attempts: 1 }]);
  assert.equal(analytics.body.courses[0].enrollments, 1);
  assert.match(analytics.body.notes.accountScope, /human/);
  const global = await get(base, '/analytics');
  assert.equal(global.body.completedAssessmentAttempts, 3);
  assert.ok(!('kind' in global.body));
});

test('pre-migration schemas degrade to all-unclassified without failing', async t => {
  const base = await start(t, mockSupabase(tablesWithKinds(), { failAccountKind: true }));
  const overview = await get(base, '/overview');
  assert.equal(overview.status, 200);
  assert.equal(overview.body.humanUsers, 0);
  assert.equal(overview.body.unclassifiedUsers, 5);
  const users = await get(base, '/users');
  assert.equal(users.status, 200);
  assert.ok(users.body.users.every(u => u.accountKind === 'unclassified'));
});

test('classification migration is additive, guarded, and performs no backfill', () => {
  const fs = require('node:fs');
  const sql = fs.readFileSync('migrations/20261012_account_classification.sql', 'utf8');
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS account_kind TEXT NOT NULL DEFAULT 'unclassified'/);
  assert.match(sql, /CHECK \(account_kind IN \('human', 'test', 'demo', 'unclassified'\)\)/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS users_account_kind_idx/);
  const executable = sql.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n');
  assert.doesNotMatch(executable, /UPDATE public\.users SET account_kind/);
  assert.doesNotMatch(executable, /DROP TABLE|TRUNCATE|DELETE FROM/);
});
