const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getCareerTestCompleted } = require('../auth-api');

const alice = '11111111-1111-4111-8111-111111111111';

// Minimal mock of the career_test_attempts query chain used by
// fetchLatestCareerAttempt: from().select().eq().order().limit().
function attemptDb(attempts, { fail = false } = {}) {
  return {
    from(table) {
      assert.equal(table, 'career_test_attempts');
      const query = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        limit() {
          if (fail) return Promise.resolve({ data: null, error: { message: 'db down' } });
          return Promise.resolve({ data: attempts.slice(0, 1), error: null });
        }
      };
      return query;
    }
  };
}

test('a user with a completed assessment reports true', async () => {
  const db = attemptDb([{ id: 'a1', user_id: alice, completed: true }]);
  assert.equal(await getCareerTestCompleted(db, alice), true);
});

test('a user with no attempt or an incomplete attempt reports false', async () => {
  assert.equal(await getCareerTestCompleted(attemptDb([]), alice), false);
  assert.equal(await getCareerTestCompleted(attemptDb([{ id: 'a1', user_id: alice, completed: false }]), alice), false);
  assert.equal(await getCareerTestCompleted(attemptDb([{ id: 'a1', user_id: alice, completed: null }]), alice), false);
});

test('a database failure propagates so the caller can degrade honestly', async () => {
  await assert.rejects(
    getCareerTestCompleted(attemptDb([], { fail: true }), alice),
    /Career assessment lookup failed/
  );
});

test('the login route resolves completion through the shared helper', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /getCareerTestCompleted[(]supabase, user[.]id[)]/);
  assert.ok(server.includes('careerTestCompleted'), 'login payload carries the completion flag');
});

test('the login response carries the completion flag without changing shape', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const loginBlock = server.slice(server.indexOf("app.post('/api/auth/login'"), server.indexOf("app.get('/api/auth/me'"));
  assert.match(loginBlock, /token: session\.access_token/);
  assert.match(loginBlock, /refresh_token: session\.refresh_token/);
  assert.match(loginBlock, /careerGoal: userMetadata\?\.career_goal/);
  assert.match(loginBlock, /careerTestCompleted\r?$/m);
});

test('login redirect honors next first, then the completion flag', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.js'), 'utf8');
  const branch = js.slice(js.indexOf('if (authReturnTarget)'), js.indexOf('if (authReturnTarget)') + 400);
  assert.match(branch, /if \(authReturnTarget\) \{\s*window\.location\.href = authReturnTarget;/);
  assert.match(branch, /else if \(data\.user\.careerTestCompleted\) \{\s*window\.location\.href = "dashboard\.html";/);
  assert.match(branch, /window\.location\.href = "career-test\.html";/);
});

test('an unknown completion status routes like not-completed, never to dashboard', () => {
  // login.js uses a truthiness check, so null (lookup failed) and undefined
  // (old responses) fall through to career-test.html, whose page reloads any
  // saved completed result. Only an explicit true reaches the dashboard.
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.js'), 'utf8');
  assert.doesNotMatch(js, /careerTestCompleted\s*===?\s*false/);
  const routeFor = flag => {
    if (flag) return 'dashboard.html';
    return 'career-test.html';
  };
  assert.equal(routeFor(true), 'dashboard.html');
  assert.equal(routeFor(false), 'career-test.html');
  assert.equal(routeFor(null), 'career-test.html');
  assert.equal(routeFor(undefined), 'career-test.html');
});

test('the login route resolves unknown instead of false on lookup failure', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const loginBlock = server.slice(server.indexOf("app.post('/api/auth/login'"), server.indexOf("app.get('/api/auth/me'"));
  assert.match(loginBlock, /let careerTestCompleted = null;/);
});
