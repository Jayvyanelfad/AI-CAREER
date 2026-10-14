const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  AUTH_COOKIE_NAME,
  createAuthSessionRouter,
  createRequirePageAuthentication
} = require('../auth-session');

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'student@example.test' };

function accessToken(exp = Math.floor(Date.now() / 1000) + 3600) {
  return 'header.' + Buffer.from(JSON.stringify({ exp, sub: user.id })).toString('base64url') + '.signature';
}

async function start(t, options = {}) {
  const validToken = options.validToken || accessToken();
  const authError = options.authError || null;
  const admin = options.admin === true;
  const app = express();
  app.use(express.json());

  const createAuthClient = () => ({
    auth: {
      getUser: async token => {
        if (authError) return { data: { user: null }, error: authError };
        return token === validToken
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { status: 401 } };
      }
    }
  });

  app.use('/api/auth/session-cookie', createAuthSessionRouter({
    createAuthClient,
    logger: { error() {} }
  }));
  app.use(createRequirePageAuthentication({
    createAuthClient,
    isAdmin: async userId => admin && userId === user.id,
    logger: { error() {} }
  }));
  app.get('/dashboard.html', (_req, res) => res.send('dashboard'));
  app.get('/admin.html', (_req, res) => res.send('admin'));
  app.get('/certificate.html', (_req, res) => res.send('certificate'));
  app.get('/login.html', (_req, res) => res.send('login'));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  return { app, base, validToken, origin: base };
}

const sameOriginPost = (base, body, origin = base, method = 'POST') => fetch(base + '/api/auth/session-cookie', {
  method,
  headers: {
    Origin: origin,
    ...(body ? { 'Content-Type': 'application/json' } : {})
  },
  body: body ? JSON.stringify(body) : undefined,
  redirect: 'manual'
});

test('session-cookie endpoint verifies the token and sets an HttpOnly cookie', async t => {
  const ctx = await start(t);
  const response = await sameOriginPost(ctx.base, { accessToken: ctx.validToken });
  assert.equal(response.status, 204);
  const cookie = response.headers.get('set-cookie') || '';
  assert.match(cookie, new RegExp('^' + AUTH_COOKIE_NAME + '='));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Path=\//i);
});

test('session-cookie endpoint rejects missing, expired and invalid tokens', async t => {
  const ctx = await start(t);
  assert.equal((await sameOriginPost(ctx.base, null)).status, 400);
  const expired = accessToken(Math.floor(Date.now() / 1000) - 1);
  assert.equal((await sameOriginPost(ctx.base, { accessToken: expired })).status, 401);
  assert.equal((await sameOriginPost(ctx.base, { accessToken: 'invalid.jwt.token' })).status, 401);
});

test('session-cookie endpoint rejects cross-origin requests', async t => {
  const ctx = await start(t);
  const response = await sameOriginPost(ctx.base, { accessToken: ctx.validToken }, 'https://attacker.example');
  assert.equal(response.status, 403);
});

test('protected pages redirect without a session cookie and allow verified sessions', async t => {
  const ctx = await start(t);
  const noCookie = await fetch(ctx.base + '/dashboard.html', { redirect: 'manual' });
  assert.equal(noCookie.status, 302);
  assert.match(noCookie.headers.get('location'), /^\/login\.html\?authRequired=1&next=/);

  const allowed = await fetch(ctx.base + '/dashboard.html', {
    headers: { Cookie: AUTH_COOKIE_NAME + '=' + ctx.validToken },
    redirect: 'manual'
  });
  assert.equal(allowed.status, 200);
  assert.equal(await allowed.text(), 'dashboard');
});

test('public certificate verification stays public while private certificate pages are gated', async t => {
  const ctx = await start(t);
  const verification = await fetch(ctx.base + '/certificate.html?verify=11111111-1111-4111-8111-111111111111', { redirect: 'manual' });
  assert.equal(verification.status, 200);
  const privateView = await fetch(ctx.base + '/certificate.html', { redirect: 'manual' });
  assert.equal(privateView.status, 302);
});

test('admin page requires server-side membership after authentication', async t => {
  const notAdmin = await start(t);
  const denied = await fetch(notAdmin.base + '/admin.html', {
    headers: { Cookie: AUTH_COOKIE_NAME + '=' + notAdmin.validToken },
    redirect: 'manual'
  });
  assert.equal(denied.status, 403);

  const admin = await start(t, { admin: true });
  const allowed = await fetch(admin.base + '/admin.html', {
    headers: { Cookie: AUTH_COOKIE_NAME + '=' + admin.validToken },
    redirect: 'manual'
  });
  assert.equal(allowed.status, 200);
});

test('transient Auth provider errors fail closed with a service-unavailable response', async t => {
  const ctx = await start(t, { authError: { status: 503 } });
  const response = await fetch(ctx.base + '/dashboard.html', {
    headers: { Cookie: AUTH_COOKIE_NAME + '=' + ctx.validToken },
    redirect: 'manual'
  });
  assert.equal(response.status, 503);
});
