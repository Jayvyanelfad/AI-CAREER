const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

async function staticServer(t) {
  const app = express(); app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  return { base: `http://127.0.0.1:${server.address().port}`, server };
}

async function closeBrowser(t, browser) {
  t.after(async () => { await browser.close().catch(() => {}); });
}

test('chatbot page renders exactly one chat widget', async t => {
  const { base } = await staticServer(t);
  const browser = await chromium.launch({ headless: true });
  closeBrowser(t, browser);
  const page = await browser.newPage();
  await page.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.route('**/fonts.googleapis.com/**', route => route.abort());
  await page.goto(`${base}/chatbot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#chatbot-body').count(), 1);
  assert.equal(await page.locator('#chat-input').count(), 1);
  assert.equal(await page.locator('#send-message').count(), 1);
  assert.equal(await page.locator('#chatbot-window').count(), 1);
  await page.close();
});

test('chatbot answers navigation questions honestly when AI is down', async t => {
  const express = require('express');
  const { chromium } = require('playwright');
  const app = express(); app.use(express.static('public'));
  // Authenticated session, but the AI provider fails.
  app.post('/api/ai/chat', (req, res) => res.status(503).json({ error: 'AI unavailable' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const browser = await chromium.launch({ headless: true });
  closeBrowser(t, browser);
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('token', 't');
    localStorage.setItem('aicareer-language', 'en');
    window.supabase = { auth: {
      getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null }),
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  await page.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.route('**/fonts.googleapis.com/**', route => route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/chatbot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('#chat-input').fill('where are the courses?');
  await page.locator('#send-message').click();
  // Local-first guide: the route surfaces as a verified action link, the
  // message stays honest, and admin pages are never referenced.
  await page.waitForSelector('.guide-action[href="courses.html"]', { timeout: 15000 });
  const firstReply = await page.locator('#chatbot-body .message.bot').last().innerText();
  assert.doesNotMatch(firstReply, /admin/i);
  assert.doesNotMatch(firstReply, /\.html/, 'route travels in the action link, not the prose');

  async function ask(question) {
    const before = await page.locator('#chatbot-body .message.bot').count();
    const linksBefore = await page.locator('#chatbot-body .guide-action').count();
    await page.locator('#chat-input').fill(question);
    await page.locator('#send-message').click();
    await page.waitForFunction(prev => {
      const items = [...document.querySelectorAll('#chatbot-body .message.bot')];
      return items.length > prev && !items[items.length - 1].textContent.includes('Thinking');
    }, before, { timeout: 15000 });
    return {
      text: await page.locator('#chatbot-body .message.bot').last().innerText(),
      links: await page.locator('#chatbot-body .guide-action').count() - linksBefore
    };
  }
  const cases = [
    ['how do I reset my password?', 'login.html'],
    ['where is my exam?', 'courses.html'],
    ['how do I change language to arabic?', 'profile.html'],
    ['why does run code fail?', 'programming.html'],
    ['how do I verify a certificate?', 'certificate.html'],
    ['how do I register?', 'register.html']
  ];
  for (const [question, route] of cases) {
    const answer = await ask(question);
    assert.doesNotMatch(answer.text, /admin/i, `no admin exposure for: ${question}`);
    const hrefs = await page.locator('#chatbot-body .guide-action').evaluateAll(els => els.map(e => e.getAttribute('href')));
    assert.ok(hrefs.includes(route), `verified route ${route} for: ${question}`);
  }
  const unknown = await ask('what is the meaning of life?');
  assert.doesNotMatch(unknown.text, /\.html/, 'unknown questions get no fabricated route');
  await page.close();
  await context.close();
});

// A signed-in learner, so auth-gated pages are not redirected away before the
// stylesheet has a chance to load.
async function signedInContext(t, browser) {
  const context = await browser.newContext();
  t.after(async () => { await context.close().catch(() => {}); });
  await context.addInitScript(() => {
    localStorage.setItem('token', 't');
    localStorage.setItem('aicareer-language', 'en');
    const session = { access_token: 't', user: { id: 'u1' } };
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  return context;
}

test('presentation polish layer is scoped to the pages that opt in', async t => {
  const { base } = await staticServer(t);
  const browser = await chromium.launch({ headless: true });
  closeBrowser(t, browser);

  // Only these pages deliberately load the shared polish stylesheet.
  const opted = ['dashboard.html', 'courses.html', 'career-test.html', 'course-detail.html'];
  const allPages = fs.readdirSync(path.join(__dirname, '..', 'public'))
    .filter(file => file.endsWith('.html'));

  for (const file of allPages) {
    const markup = fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8');
    const linked = /<link[^>]+href="ui-polish\.css"/.test(markup);
    assert.equal(linked, opted.includes(file),
      `${file} should ${opted.includes(file) ? '' : 'not '}link the polish stylesheet`);
  }

  // Opting in must actually work at runtime, not just in markup: the sheet has
  // to load. The design tokens are only declared for the three pages that
  // adopted the full token set; course-detail opts in for its layout rules.
  const tokenPages = ['dashboard.html', 'courses.html', 'career-test.html'];
  const context = await signedInContext(t, browser);
  const page = await context.newPage();
  for (const file of opted) {
    await page.goto(`${base}/${file}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForTimeout(1200);
    const applied = await page.evaluate(() => ({
      loaded: [...document.styleSheets].some(sheet => (sheet.href || '').includes('ui-polish.css')),
      token: getComputedStyle(document.body).getPropertyValue('--ui-radius').trim()
    }));
    assert.equal(applied.loaded, true, `${file} loads the polish stylesheet at runtime`);
    if (tokenPages.includes(file)) {
      assert.equal(applied.token, '14px', `${file} receives the polish design tokens`);
    }
  }
  await page.close();

  // A page that did not opt in must stay completely untouched by it.
  const anon = await browser.newPage();
  await anon.goto(`${base}/certificate.html?verify=11111111-1111-4111-8111-111111111111`, { waitUntil: 'domcontentloaded' });
  await anon.waitForTimeout(1000);
  const untouched = await anon.evaluate(() => ({
    loaded: [...document.styleSheets].some(sheet => (sheet.href || '').includes('ui-polish.css')),
    token: getComputedStyle(document.body).getPropertyValue('--ui-radius').trim()
  }));
  assert.equal(untouched.loaded, false, 'certificate.html does not load the polish stylesheet');
  assert.equal(untouched.token, '', 'no polish tokens leak onto pages that did not opt in');
  await anon.close();
});

test('public certificate verification stays public, private views stay gated', async t => {
  const { base } = await staticServer(t);
  const browser = await chromium.launch({ headless: true });
  closeBrowser(t, browser);
  const page = await browser.newPage();
  await page.goto(`${base}/certificate.html?verify=11111111-1111-4111-8111-111111111111`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.ok(page.url().includes('certificate.html?verify='), `verify link must not redirect, got ${page.url()}`);
  await page.goto(`${base}/certificate.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.ok(page.url().includes('login.html'), `private certificate view must redirect to login, got ${page.url()}`);
  await page.close();
});
