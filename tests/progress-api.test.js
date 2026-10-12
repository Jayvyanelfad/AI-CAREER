const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createProgressRouter } = require('../progress-api');

const OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OWNER_ENROLLMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OTHER_ENROLLMENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function memorySupabase(rows) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'enrollments');
      const state = { filters: [], update: null, count: false };
      const result = () => {
        const matches = rows.filter(row => state.filters.every(([key, value]) => row[key] === value));
        if (state.update) matches.forEach(row => Object.assign(row, state.update));
        return { data: matches, count: state.count ? matches.length : null, error: null };
      };
      const query = {
        update(payload) { state.update = payload; calls.push({ type: 'update', payload }); return query; },
        select(_fields, options) { state.count = options?.count === 'exact'; return query; },
        eq(key, value) { state.filters.push([key, value]); calls.push({ type: 'eq', key, value }); return query; },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); }
      };
      return query;
    }
  };
}

async function start(t, supabase) {
  const app = express();
  app.use(express.json());
  app.use('/api/progress', createProgressRouter({
    supabase,
    authenticateToken(req, res, next) {
      if (req.headers.authorization !== 'Bearer owner') return res.status(401).json({ error: 'Access token required' });
      req.user = { id: OWNER_ID };
      return next();
    },
    logger: { error() {} }
  }));
  const server = createServer(app).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api/progress`;
}

test('progress persistence uses active enrollment columns and scopes writes to the owner', async t => {
  const rows = [
    { id: OWNER_ENROLLMENT_ID, user_id: OWNER_ID, progress: 0, completed_hours: 0 },
    { id: OTHER_ENROLLMENT_ID, user_id: OTHER_ID, progress: 0, completed_hours: 0 }
  ];
  const db = memorySupabase(rows);
  const url = await start(t, db);

  assert.equal((await fetch(url, { method: 'POST' })).status, 401);
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ enrollmentId: OWNER_ENROLLMENT_ID, progress: 40, completedHours: 3 })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: 'Progress updated successfully' });
  assert.deepEqual(rows[0], { id: OWNER_ENROLLMENT_ID, user_id: OWNER_ID, progress: 40, completed_hours: 3 });
  assert.deepEqual(rows[1], { id: OTHER_ENROLLMENT_ID, user_id: OTHER_ID, progress: 0, completed_hours: 0 });
  assert.ok(db.calls.some(call => call.type === 'eq' && call.key === 'user_id' && call.value === OWNER_ID));
  assert.equal(db.calls.some(call => call.type === 'eq' && call.key === 'userId'), false);
  assert.equal(Object.hasOwn(db.calls.find(call => call.type === 'update').payload, 'completedHours'), false);
});

test('progress endpoint preserves validation and does not update a foreign enrollment', async t => {
  const rows = [{ id: OTHER_ENROLLMENT_ID, user_id: OTHER_ID, progress: 0, completed_hours: 0 }];
  const url = await start(t, memorySupabase(rows));

  const malformed = await fetch(url, {
    method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ enrollmentId: OTHER_ENROLLMENT_ID })
  });
  assert.equal(malformed.status, 400);

  const foreign = await fetch(url, {
    method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ enrollmentId: OTHER_ENROLLMENT_ID, progress: 100, completedHours: 12 })
  });
  assert.equal(foreign.status, 404);
  assert.deepEqual(rows[0], { id: OTHER_ENROLLMENT_ID, user_id: OTHER_ID, progress: 0, completed_hours: 0 });
});

test('progress endpoint rejects values that the integer enrollment schema cannot represent', async t => {
  const rows = [{ id: OWNER_ENROLLMENT_ID, user_id: OWNER_ID, progress: 0, completed_hours: 0 }];
  const url = await start(t, memorySupabase(rows));
  const cases = [
    [{ enrollmentId: 'not-a-uuid', progress: 10 }, 'Enrollment ID must be a valid UUID'],
    [{ enrollmentId: OWNER_ENROLLMENT_ID, progress: 100.5 }, 'Progress must be an integer from 0 to 100'],
    [{ enrollmentId: OWNER_ENROLLMENT_ID, progress: 101 }, 'Progress must be an integer from 0 to 100'],
    [{ enrollmentId: OWNER_ENROLLMENT_ID, progress: 10, completedHours: -1 }, 'Completed hours must be a non-negative integer'],
    [{ enrollmentId: OWNER_ENROLLMENT_ID, progress: 10, completedHours: '4' }, 'Completed hours must be a non-negative integer']
  ];
  for (const [body, error] of cases) {
    const response = await fetch(url, {
      method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, error);
  }
  assert.deepEqual(rows[0], { id: OWNER_ENROLLMENT_ID, user_id: OWNER_ID, progress: 0, completed_hours: 0 });
});

test('progress endpoint reports database write failures without claiming persistence', async t => {
  const databaseError = { code: '42501', message: 'permission denied' };
  const query = {
    update() { return query; },
    eq() { return query; },
    then(resolve, reject) { return Promise.resolve({ error: databaseError }).then(resolve, reject); }
  };
  const url = await start(t, { from: table => { assert.equal(table, 'enrollments'); return query; } });
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ enrollmentId: OWNER_ENROLLMENT_ID, progress: 10, completedHours: 1 })
  });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'Failed to update progress');
});
