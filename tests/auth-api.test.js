const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAuthRouter } = require('../auth-api');

const alice = '11111111-1111-4111-8111-111111111111';

function makeDb(users, failures = {}) {
  const seen = { inserts: [], updates: [] };
  return {
    seen,
    from(table) {
      assert.equal(table, 'users');
      const filters = [];
      const pending = {};
      const apply = () => users.filter(row => filters.every(([f, v]) => row[f] === v));
      const query = {
        select() { return query; },
        eq(field, value) { filters.push([field, value]); return query; },
        maybeSingle() {
          if (failures.read) return Promise.resolve({ data: null, error: { message: 'db down' } });
          return Promise.resolve({ data: apply()[0] || null, error: null });
        },
        insert(row) {
          seen.inserts.push(row);
          if (users.some(u => u.id === row.id)) {
            return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
          }
          if (failures.insert) return Promise.resolve({ error: { message: 'db down' } });
          users.push({ ...row });
          return Promise.resolve({ error: null });
        },
        update(patch) { pending.patch = patch; return query; },
        then(resolve, reject) {
          if (pending.patch) {
            seen.updates.push(pending.patch);
            if (failures.update) return Promise.resolve({ error: { message: 'db down' } }).then(resolve, reject);
            apply().forEach(row => Object.assign(row, pending.patch));
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          return Promise.resolve().then(resolve, reject);
        }
      };
      return query;
    }
  };
}

function authClientScript({ signUp, signIn }) {
  return () => ({
    auth: {
      signUp: async () => signUp(),
      signInWithPassword: async () => signIn()
    }
  });
}

const newUser = () => ({ id: alice, email: 'a@example.test', identities: [{ id: 'x' }] });
const session = () => ({ session: { access_token: 'tok', refresh_token: 'ref' }, user: newUser() });

function authed(req, res, next) {
  if (req.headers.authorization === 'Bearer alice') {
    req.user = { id: alice, name: 'Asha', careerGoal: 'engineer' };
    return next();
  }
  return res.status(401).json({ error: 'Access token required' });
}

async function start(t, db, clientFactory) {
  const app = express(); app.use(express.json());
  app.use('/api', createAuthRouter({
    supabase: db,
    authenticateToken: authed,
    createAuthClient: clientFactory,
    getAuthCallbackUrl: () => 'http://localhost:5000/auth-callback.html'
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

const register = (base, body) => fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

test('successful registration creates the profile and reports completion', async t => {
  const users = [];
  const base = await start(t, makeDb(users), authClientScript({
    signUp: () => ({ data: { user: newUser() }, error: null }),
    signIn: () => ({ data: session(), error: null })
  }));
  const res = await register(base, { email: 'a@example.test', password: 'secret12', name: 'Asha' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.profileComplete, true);
  assert.equal(body.token, 'tok');
  assert.deepEqual(users, [{ id: alice, full_name: 'Asha', career_goal: 'undecided' }]);
});

test('failed profile creation is reported honestly instead of as complete', async t => {
  const users = [];
  const base = await start(t, makeDb(users, { insert: true }), authClientScript({
    signUp: () => ({ data: { user: newUser() }, error: null }),
    signIn: () => ({ data: session(), error: null })
  }));
  const res = await register(base, { email: 'a@example.test', password: 'secret12', name: 'Asha' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.profileComplete, false);
  assert.equal(body.token, 'tok');
  assert.deepEqual(users, []);
});

test('registration retry with an existing profile row succeeds without duplicating', async t => {
  const users = [{ id: alice, full_name: 'Asha', career_goal: 'undecided' }];
  const base = await start(t, makeDb(users), authClientScript({
    signUp: () => ({ data: { user: newUser() }, error: null }),
    signIn: () => ({ data: session(), error: null })
  }));
  const res = await register(base, { email: 'a@example.test', password: 'secret12', name: 'Asha' });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).profileComplete, true);
  assert.equal(users.length, 1);
});

test('duplicate emails and missing fields are rejected', async t => {
  const errClient = authClientScript({
    signUp: () => ({ data: { user: null }, error: { message: 'User already registered' } }),
    signIn: () => { throw new Error('must not sign in'); }
  });
  const base = await start(t, makeDb([]), errClient);
  assert.equal((await register(base, { email: 'a@example.test', password: 'secret12', name: 'Asha' })).status, 400);

  const ghostClient = authClientScript({
    signUp: () => ({ data: { user: { ...newUser(), identities: [] } }, error: null }),
    signIn: () => { throw new Error('must not sign in'); }
  });
  const ghostBase = await start(t, makeDb([]), ghostClient);
  assert.equal((await register(ghostBase, { email: 'a@example.test', password: 'secret12', name: 'Asha' })).status, 400);

  const okBase = await start(t, makeDb([]), authClientScript({
    signUp: () => { throw new Error('must not sign up'); },
    signIn: () => { throw new Error('must not sign in'); }
  }));
  assert.equal((await register(okBase, { email: 'a@example.test' })).status, 400);
  assert.equal((await register(okBase, { email: '  ', password: 'secret12', name: 'Asha' })).status, 400);
  assert.equal((await register(okBase, { email: 'a@example.test', password: 'secret12', name: '   ' })).status, 400);
});

test('provider errors map to safe statuses without leaking details', async t => {
  const limited = await start(t, makeDb([]), authClientScript({
    signUp: () => ({ data: { user: null }, error: { message: 'Too many requests, rate limit exceeded' } }),
    signIn: () => { throw new Error('must not sign in'); }
  }));
  const limitedRes = await register(limited, { email: 'a@example.test', password: 'secret12', name: 'Asha' });
  assert.equal(limitedRes.status, 429);
  assert.deepEqual(await limitedRes.json(), { error: 'Too many registration attempts. Please try again later.' });

  const badMail = await start(t, makeDb([]), authClientScript({
    signUp: () => ({ data: { user: null }, error: { message: 'Invalid email address format' } }),
    signIn: () => { throw new Error('must not sign in'); }
  }));
  const mailRes = await register(badMail, { email: 'x', password: 'secret12', name: 'Asha' });
  assert.equal(mailRes.status, 400);
  assert.deepEqual(await mailRes.json(), { error: 'A valid email address is required' });
});

test('complete-registration inserts a missing profile row', async t => {
  const users = [];
  const db = makeDb(users);
  const base = await start(t, db, authClientScript({ signUp: null, signIn: null }));
  const res = await fetch(`${base}/api/auth/complete-registration`, { method: 'POST', headers: { Authorization: 'Bearer alice' } });
  assert.equal(res.status, 204);
  assert.deepEqual(users, [{ id: alice, full_name: 'Asha', career_goal: 'engineer' }]);
});

test('complete-registration repairs only missing values and preserves edits', async t => {
  const users = [{ id: alice, full_name: null, career_goal: 'scientist' }];
  const db = makeDb(users);
  const base = await start(t, db, authClientScript({ signUp: null, signIn: null }));
  assert.equal((await fetch(`${base}/api/auth/complete-registration`, { method: 'POST', headers: { Authorization: 'Bearer alice' } })).status, 204);
  assert.deepEqual(db.seen.updates, [{ full_name: 'Asha' }]);
  assert.deepEqual(users[0], { id: alice, full_name: 'Asha', career_goal: 'scientist' });
});

test('complete-registration leaves complete rows untouched and wins races', async t => {
  const users = [{ id: alice, full_name: 'Asha', career_goal: 'engineer' }];
  const db = makeDb(users);
  const base = await start(t, db, authClientScript({ signUp: null, signIn: null }));
  assert.equal((await fetch(`${base}/api/auth/complete-registration`, { method: 'POST', headers: { Authorization: 'Bearer alice' } })).status, 204);
  assert.deepEqual(db.seen.updates, []);
  assert.deepEqual(db.seen.inserts, []);

  // Concurrent retry: the row vanished from the read but the insert collides.
  const racy = [];
  const racyDb = makeDb(racy);
  racy.push({ id: alice, full_name: 'Asha', career_goal: 'engineer' });
  const origFrom = racyDb.from.bind(racyDb);
  racyDb.from = table => {
    const q = origFrom(table);
    q.maybeSingle = () => Promise.resolve({ data: null, error: null });
    return q;
  };
  const racyBase = await start(t, racyDb, authClientScript({ signUp: null, signIn: null }));
  assert.equal((await fetch(`${racyBase}/api/auth/complete-registration`, { method: 'POST', headers: { Authorization: 'Bearer alice' } })).status, 204);
});

test('complete-registration hides database details and requires auth', async t => {
  const base = await start(t, makeDb([], { read: true }), authClientScript({ signUp: null, signIn: null }));
  const res = await fetch(`${base}/api/auth/complete-registration`, { method: 'POST', headers: { Authorization: 'Bearer alice' } });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Could not complete account setup' });
  const anon = await fetch(`${base}/api/auth/complete-registration`, { method: 'POST' });
  assert.equal(anon.status, 401);
});
