const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createProgrammingExecutionRouter } = require('../programming-execution-api');
const { ExecutionRateLimiter } = require('../programming-execution-limiter');
const {
  createExecutionProvider,
  UnavailableExecutionProvider,
  PistonExecutionProvider,
  normalizeProviderResult,
  truncateOutput,
  normalizePistonBaseUrl
} = require('../programming-execution-provider');

const TEST_LIMITS = {
  timeoutMs: 5000,
  maxCodeBytes: 1024,
  maxStdinBytes: 256,
  maxOutputBytes: 64 * 1024,
  maxConcurrentRuns: 4
};

// Stand-in for the Supabase auth middleware: honors the same Bearer contract
// but never touches Supabase.
function fakeAuthenticateToken(req, res, next) {
  const header = req.headers['authorization'] || '';
  if (header === 'Bearer test-token') {
    req.user = { id: 'user-1', email: 'user@example.com', name: 'User' };
    return next();
  }
  return res.status(401).json({ error: 'Access token required' });
}

function makeMockProvider(behavior) {
  const calls = [];
  return {
    calls,
    isAvailable: () => behavior.available !== false,
    run: async request => {
      calls.push(request);
      if (behavior.throw) {
        const error = new Error(behavior.throw.message || 'provider failed');
        error.code = behavior.throw.code;
        throw error;
      }
      return behavior.result;
    }
  };
}

async function startServer(t, { provider, rateLimiter, logger }) {
  const app = express();
  app.use(express.json());
  app.use('/api/programming', createProgrammingExecutionRouter({
    authenticateToken: fakeAuthenticateToken,
    provider,
    limits: TEST_LIMITS,
    rateLimiter: rateLimiter || new ExecutionRateLimiter({
      maxRunsPerWindow: 50, windowMs: 60_000, maxConcurrentRuns: 4
    }),
    logger: logger || { log: () => {} }
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function postRun(base, body, headers = {}) {
  return fetch(`${base}/api/programming/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token', ...headers },
    body: JSON.stringify(body)
  });
}

test('unauthenticated run is rejected with 401', async t => {
  const provider = makeMockProvider({ result: { stdout: 'x', stderr: '', exitCode: 0, durationMs: 1, timedOut: false } });
  const base = await startServer(t, { provider });
  const res = await fetch(`${base}/api/programming/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'python', code: 'print(1)' })
  });
  assert.equal(res.status, 401);
  assert.equal(provider.calls.length, 0, 'provider must never be invoked without auth');
});

test('unsupported language is rejected', async t => {
  const provider = makeMockProvider({ result: {} });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'rust', code: 'fn main(){}' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'UNSUPPORTED_LANGUAGE');
  assert.equal(provider.calls.length, 0);
});

test('empty and blank code are rejected', async t => {
  const provider = makeMockProvider({ result: {} });
  const base = await startServer(t, { provider });
  for (const code of ['', '   \n  ']) {
    const res = await postRun(base, { language: 'python', code });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'EMPTY_CODE');
  }
  assert.equal(provider.calls.length, 0);
});

test('oversized code is rejected', async t => {
  const provider = makeMockProvider({ result: {} });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'python', code: 'x'.repeat(TEST_LIMITS.maxCodeBytes + 1) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'CODE_TOO_LARGE');
});

test('oversized stdin is rejected', async t => {
  const provider = makeMockProvider({ result: {} });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'python', code: 'print(1)', stdin: 'x'.repeat(TEST_LIMITS.maxStdinBytes + 1) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'STDIN_TOO_LARGE');
});

test('invalid lessonId is rejected', async t => {
  const provider = makeMockProvider({ result: {} });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'python', code: 'print(1)', lessonId: '"; DROP TABLE users; --' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_LESSON_ID');
});

test('normal Python executes through provider abstraction', async t => {
  const provider = makeMockProvider({ result: { stdout: '30\n', stderr: '', exitCode: 0, durationMs: 42, timedOut: false } });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'python', code: 'print(10 + 20)' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.result, { stdout: '30\n', stderr: '', exitCode: 0, durationMs: 42, timedOut: false });
  assert.equal(provider.calls.length, 1);
  assert.equal(provider.calls[0].language, 'python');
});

test('normal JavaScript executes through provider abstraction', async t => {
  const provider = makeMockProvider({ result: { stdout: 'Hello Alex\n', stderr: '', exitCode: 0, durationMs: 17, timedOut: false } });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'javascript', code: 'console.log("Hello Alex")' });
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.result.stdout, 'Hello Alex\n');
  assert.equal(provider.calls[0].language, 'javascript');
});

test('runtime error becomes execution result, not HTTP 500', async t => {
  const provider = makeMockProvider({ result: { stdout: '', stderr: 'NameError: name \'x\' is not defined', exitCode: 1, durationMs: 9, timedOut: false } });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'python', code: 'print(x)' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.result.exitCode, 1);
  assert.match(body.result.stderr, /NameError/);
});

test('timeout becomes execution result', async t => {
  const provider = makeMockProvider({ result: { stdout: '', stderr: 'Execution timed out.', exitCode: null, durationMs: 5000, timedOut: true } });
  const base = await startServer(t, { provider });
  const res = await postRun(base, { language: 'python', code: 'while True: pass' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.timedOut, true);
  assert.equal(body.result.exitCode, null);
  assert.equal(body.result.stderr, 'Execution timed out.');
});

test('provider unavailable does NOT execute locally', async t => {
  const base = await startServer(t, { provider: new UnavailableExecutionProvider() });
  const res = await postRun(base, { language: 'python', code: 'print("should never run")' });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error.code, 'EXECUTION_PROVIDER_UNAVAILABLE');
  assert.match(body.error.message, /temporarily unavailable/i);
});

test('provider unavailable via factory does not create a local executor', () => {
  const provider = createExecutionProvider({});
  assert.equal(provider.isAvailable(), false);
  const configured = createExecutionProvider({ PROGRAMMING_EXECUTION_PROVIDER: 'piston', PISTON_BASE_URL: 'https://example.invalid' });
  assert.equal(configured.isAvailable(), true);
});

test('provider URL must be a public HTTPS endpoint', () => {
  assert.equal(normalizePistonBaseUrl('https://runner.example.com/'), 'https://runner.example.com');
  for (const invalid of ['http://runner.example.com', 'https://localhost', 'https://127.0.0.1', 'https://runner.local', 'https://user:pass@runner.example.com', 'not-a-url']) {
    assert.equal(normalizePistonBaseUrl(invalid), null, invalid);
  }
  assert.equal(createExecutionProvider({ PROGRAMMING_EXECUTION_PROVIDER: 'piston', PISTON_BASE_URL: 'http://localhost:2000' }).isAvailable(), false);
});

test('Piston provider sends bounded requests and normalizes provider failures', async () => {
  let request;
  const provider = new PistonExecutionProvider({
    baseUrl: 'https://runner.example.com',
    fetchImpl: async (_url, options) => {
      request = options;
      return { ok: true, json: async () => ({ run: { stdout: 'ok\n', stderr: '', code: 0 } }) };
    }
  });
  const result = await provider.run({ language: 'python', code: 'print(1)', stdin: 'x', limits: TEST_LIMITS });
  assert.equal(provider.isAvailable(), true);
  assert.equal(request.signal instanceof AbortSignal, true);
  assert.deepEqual(JSON.parse(request.body), {
    language: 'python', version: '*', files: [{ content: 'print(1)' }], stdin: 'x', run_timeout: TEST_LIMITS.timeoutMs, compile_timeout: TEST_LIMITS.timeoutMs
  });
  assert.equal(result.stdout, 'ok\n');
  const failed = new PistonExecutionProvider({ baseUrl: 'https://runner.example.com', fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(() => failed.run({ language: 'python', code: 'print(1)', stdin: '', limits: TEST_LIMITS }), error => error.code === 'EXECUTION_PROVIDER_ERROR');
});

test('execution status truthfully reports an unavailable external provider', async t => {
  const base = await startServer(t, { provider: new UnavailableExecutionProvider('PISTON_BASE_URL must be a public HTTPS hostname for the Piston sandbox provider.') });
  const res = await fetch(`${base}/api/programming/status`, { headers: { Authorization: 'Bearer test-token' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    available: false,
    supportedLanguages: [],
    blocker: 'PISTON_BASE_URL must be a public HTTPS hostname for the Piston sandbox provider.'
  });
});

test('output limit truncation is enforced', () => {
  const huge = 'a'.repeat(100 * 1024);
  const truncated = truncateOutput(huge, 1024);
  assert.ok(Buffer.byteLength(truncated) < 2048);
  assert.match(truncated, /\[output truncated\]$/);
  const normalized = normalizeProviderResult({ stdout: huge, stderr: huge, exitCode: 0, durationMs: 5, timedOut: false }, TEST_LIMITS, Date.now());
  assert.match(normalized.stdout, /\[output truncated\]$/);
  assert.match(normalized.stderr, /\[output truncated\]$/);
});

test('rate limiting works', async t => {
  const provider = makeMockProvider({ result: { stdout: 'ok\n', stderr: '', exitCode: 0, durationMs: 1, timedOut: false } });
  const rateLimiter = new ExecutionRateLimiter({ maxRunsPerWindow: 2, windowMs: 60_000, maxConcurrentRuns: 4 });
  const base = await startServer(t, { provider, rateLimiter });
  await postRun(base, { language: 'python', code: 'print(1)' });
  await postRun(base, { language: 'python', code: 'print(2)' });
  const res = await postRun(base, { language: 'python', code: 'print(3)' });
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.error.code, 'RATE_LIMITED');
  assert.match(body.error.message, /Too many code executions/);
});

test('source code is not logged', async t => {
  const logs = [];
  const provider = makeMockProvider({ result: { stdout: 'ok\n', stderr: '', exitCode: 0, durationMs: 1, timedOut: false } });
  const base = await startServer(t, { provider, logger: { log: line => logs.push(String(line)) } });
  await postRun(base, { language: 'python', code: 'SECRET_MARKER_123 print("hi")', stdin: 'SECRET_STDIN_456' });
  const combined = logs.join('\n');
  assert.ok(!combined.includes('SECRET_MARKER_123'), 'source code leaked into logs');
  assert.ok(!combined.includes('SECRET_STDIN_456'), 'stdin leaked into logs');
  assert.ok(!combined.includes('ok\\n'), 'stdout leaked into logs');
});

test('stdout/stderr is rendered as text on the client page', async () => {
  const fs = require('fs');
  const source = fs.readFileSync('public/programming.js', 'utf8');
  assert.ok(!/innerHTML\s*=.*(stdout|stderr|result\.output)/.test(source), 'output must not be injected as HTML');
  assert.match(source, /data-output-body/, 'output panel present');
});

test('frontend cannot choose arbitrary execution command/provider', async t => {
  const provider = makeMockProvider({ result: { stdout: 'ok', stderr: '', exitCode: 0, durationMs: 1, timedOut: false } });
  const base = await startServer(t, { provider });
  for (const extra of [
    { provider: 'local' },
    { command: 'cat /etc/passwd' },
    { args: ['--privileged'] },
    { image: 'evil' }
  ]) {
    const res = await postRun(base, { language: 'python', code: 'print(1)', ...extra });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'CLIENT_PROVIDER_NOT_ALLOWED');
  }
  assert.equal(provider.calls.length, 0);
});

test('concurrency guard rejects when saturated', async t => {
  let releaseProvider;
  const provider = {
    isAvailable: () => true,
    run: () => new Promise(resolve => { releaseProvider = () => resolve({ stdout: 'x', stderr: '', exitCode: 0, durationMs: 1, timedOut: false }); })
  };
  const rateLimiter = new ExecutionRateLimiter({ maxRunsPerWindow: 50, windowMs: 60_000, maxConcurrentRuns: 1 });
  const base = await startServer(t, { provider, rateLimiter });
  const first = postRun(base, { language: 'python', code: 'print(1)' });
  await new Promise(resolve => setTimeout(resolve, 50));
  const second = await postRun(base, { language: 'python', code: 'print(2)' });
  assert.equal(second.status, 429);
  releaseProvider();
  await first;
});
