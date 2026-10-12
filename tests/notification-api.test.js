const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createNotificationRouter, createNotification } = require('../notification-api');

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const one = '33333333-3333-4333-8333-333333333333';
const two = '44444444-4444-4444-8444-444444444444';

function memorySupabase(rows) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'notifications');
      const state = { filters: [], update: null, limit: null };
      const result = () => {
        let selected = rows.filter(row => state.filters.every(([field, value, mode]) => mode === 'is' ? row[field] === value : row[field] === value));
        if (state.update) selected.forEach(row => Object.assign(row, state.update));
        if (state.limit !== null) selected = selected.slice(0, state.limit);
        return { data: selected, count: selected.length, error: null };
      };
      const query = {
        select(_fields, options) { state.count = Boolean(options?.count); return query; },
        eq(field, value) { state.filters.push([field, value, 'eq']); return query; },
        is(field, value) { state.filters.push([field, value, 'is']); return query; },
        order() { return query; },
        limit(value) { state.limit = value; return query; },
        update(value) { state.update = value; return query; },
        upsert(row, options) { calls.push({ row, options }); return Promise.resolve({ error: null }); },
        maybeSingle() { const output = result(); return Promise.resolve({ data: output.data[0] || null, error: null }); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); }
      };
      return query;
    }
  };
}

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (token === 'Bearer alice') { req.user = { id: alice }; return next(); }
  if (token === 'Bearer bob') { req.user = { id: bob }; return next(); }
  return res.status(401).json({ error: 'Access token required' });
}
async function start(t, db) {
  const app = express(); app.use(express.json());
  app.use('/api/notifications', createNotificationRouter({ supabase: db, authenticateToken: auth, logger: { error() {} } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
const request = (base, path, token, options = {}) => fetch(`${base}/api/notifications${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });

test('notifications are authenticated and strictly user-scoped', async t => {
  const db = memorySupabase([
    { id: one, user_id: alice, type: 'course_completed', title: 'Alice course', body: null, href: null, read_at: null, created_at: '2026-01-01T00:00:00Z' },
    { id: two, user_id: bob, type: 'certificate_issued', title: 'Bob certificate', body: null, href: null, read_at: null, created_at: '2026-01-02T00:00:00Z' }
  ]);
  const base = await start(t, db);
  assert.equal((await fetch(`${base}/api/notifications`)).status, 401);
  const payload = await (await request(base, '?limit=50', 'alice')).json();
  assert.deepEqual(payload.notifications.map(item => item.id), [one]);
  const foreignRead = await request(base, `/${two}/read`, 'alice', { method: 'POST' });
  assert.equal(foreignRead.status, 200);
  assert.equal((await foreignRead.json()).notification, null);
  assert.equal(db.calls.length, 0);
});

test('unread count and mark-as-read only affect the owner', async t => {
  const rows = [
    { id: one, user_id: alice, type: 'course_completed', title: 'A', body: null, href: null, read_at: null, created_at: '2026-01-01T00:00:00Z' },
    { id: two, user_id: bob, type: 'course_completed', title: 'B', body: null, href: null, read_at: null, created_at: '2026-01-01T00:00:00Z' }
  ];
  const base = await start(t, memorySupabase(rows));
  assert.equal((await (await request(base, '/unread-count', 'alice')).json()).unreadCount, 1);
  assert.equal((await request(base, `/${one}/read`, 'alice', { method: 'POST' })).status, 200);
  assert.ok(rows[0].read_at);
  assert.equal(rows[1].read_at, null);
  await request(base, '/read-all', 'alice', { method: 'POST' });
  assert.equal(rows[1].read_at, null);
});

test('server event helper uses the database dedupe constraint', async () => {
  const db = memorySupabase([]);
  await createNotification(db, { userId: alice, type: 'course_completed', title: 'Course completed', dedupeKey: 'course_completed:course-1' });
  assert.deepEqual(db.calls[0], {
    row: { user_id: alice, type: 'course_completed', title: 'Course completed', body: null, href: null, dedupe_key: 'course_completed:course-1' },
    options: { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }
  });
});

test('notification migration constrains event type, ownership, deduplication, and RLS', () => {
  const migration = require('node:fs').readFileSync('migrations/20261011_notifications.sql', 'utf8');
  assert.match(migration, /unique \(user_id, dedupe_key\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /using \(auth\.uid\(\) = user_id\)/i);
  assert.match(migration, /course_completed.*certificate_issued/i);
  assert.match(migration, /revoke insert, update, delete on table public\.notifications from anon, authenticated/i);
  assert.match(migration, /grant update \(read_at\) on table public\.notifications to authenticated/i);
});
