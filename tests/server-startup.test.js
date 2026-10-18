// Regression coverage for application startup.
//
// The lesson-incompletion route was extracted from server.js into its own
// router module and mounted with app.use(). The mount was left behind without
// the matching require(), so server.js threw
//   ReferenceError: createLessonProgressRouter is not defined
// during module evaluation and the whole API refused to boot.
//
// No other test caught this: the router's own tests import lesson-progress-api
// directly, and the server.js assertions were regex matches against the source
// text, which the broken line satisfied. This test boots the real application
// and speaks HTTP to it, so a missing import fails loudly instead of green.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const STARTUP_TIMEOUT = 30000;

// Dummy credentials only. Nothing here reaches production: the server fails the
// Supabase handshake immediately and every assertion targets unauthenticated
// requests, so no production data is read or written.
function dummyEnv(port) {
  return {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    GEMINI_API_KEY: 'test-gemini-key'
  };
}

function request(port, method, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      method,
      path: requestPath,
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Boots the real server, lets `check` speak HTTP to it, then shuts it down.
// Throws with the captured output if the server dies or never listens.
async function withServer(t, check) {
  const port = 31000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: dummyEnv(port),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  const stop = () => { try { child.kill('SIGKILL'); } catch (_error) { /* already gone */ } };
  t.after(stop);

  const booted = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`server.js never reported "Server running on port". Output:\n${output.slice(0, 2000)}`)),
      STARTUP_TIMEOUT
    );
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { output += chunk; if (output.includes('Server running on port')) { clearTimeout(timer); resolve(); } });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`server.js exited with code ${code} before listening:\n${output.slice(0, 2000)}`)); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
  });

  await booted;
  const result = await check(port);
  assert.doesNotMatch(output, /is not defined|Cannot find module/, `server.js failed to load a module it calls:\n${output.slice(0, 2000)}`);
  stop();
  return { port, output, result };
}

test('server.js boots and serves requests instead of throwing on load', async t => {
  // initializeDatabase() runs after listen; its Supabase failures are expected
  // with dummy credentials and must not be read as a startup failure.
  const { result } = await withServer(t, async port => ({
    courses: await request(port, 'GET', '/api/courses'),
    incomplete: await request(port, 'POST', '/api/lessons/11111111-1111-4111-8111-111111111111/incomplete'),
    complete: await request(port, 'POST', '/api/lessons/11111111-1111-4111-8111-111111111111/complete'),
    missing: await request(port, 'POST', '/api/lessons/11111111-1111-4111-8111-111111111111/does-not-exist')
  }));
  const { courses, incomplete, complete, missing } = result;

  assert.equal(courses.status, 401, 'a running server answers requests');

  // The extracted router must actually be mounted. An unmounted router answers
  // 404, which is what a broken app.use() path produces.
  assert.equal(
    incomplete.status,
    401,
    `POST /api/lessons/:lessonId/incomplete should be mounted and auth-guarded, got ${incomplete.status} ${incomplete.body.slice(0, 120)}`
  );
  assert.match(incomplete.body, /Access token required/i);

  // The route that stayed inline in server.js must still work too.
  assert.equal(complete.status, 401, 'the inline lesson completion route is still served');

  // A route that genuinely does not exist must stay a 404, so the assertions
  // above are not passing simply because everything answers the same way.
  assert.equal(missing.status, 404, 'unknown lesson routes still 404');
});

test('every router factory server.js calls is actually imported', async t => {
  const serverSource = require('node:fs').readFileSync(path.join(ROOT, 'server.js'), 'utf8');

  // Collect the destructured names each local module is imported under.
  const imported = new Set();
  for (const match of serverSource.matchAll(/(?:const|let|var)\s+(?:\{([^}]+)\}|([A-Za-z_$][\w$]*))\s*=\s*require\(/g)) {
    if (match[1]) match[1].split(',').forEach(name => imported.add(name.split(':').pop().trim()));
    else if (match[2]) imported.add(match[2]);
  }
  for (const match of serverSource.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?!require\()/gm)) {
    imported.add(match[1]);
  }

  // Names that are parameters, globals or intentionally local helpers.
  const notLocals = new Set([
    'app', 'express', 'cors', 'dotenv', 'createClient', 'GoogleGenAI', 'randomInt',
    'supabase', 'PORT', 'HOST', 'genAI', 'process', 'console', 'require', 'module',
    'JSON', 'Math', 'Date', 'Object', 'Array', 'Set', 'Map', 'Number', 'String',
    'Boolean', 'Promise', 'Error', 'RegExp', 'URL', 'Buffer', 'isUuid', 'initializeDatabase',
    'authenticateToken', 'notify', 'formatEnrollment', 'publicAvatarUrl', 'getCareerTestCompleted'
  ]);

  // Call sites of the form createXxxRouter( or createXxxStore( that we did not import.
  const missing = new Set();
  for (const match of serverSource.matchAll(/(?:^|[^.\w])(create[A-Za-z0-9_]+(?:Router|Store))\s*\(/g)) {
    const name = match[1];
    if (!notLocals.has(name) && !imported.has(name)) missing.add(name);
  }

  assert.deepEqual([...missing], [], `server.js calls these without importing them: ${[...missing].join(', ')}`);
});