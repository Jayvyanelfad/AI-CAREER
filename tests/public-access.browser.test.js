const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

async function staticServer(t) {
  const app = express(); app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('chatbot page renders exactly one chat widget', async t => {
  const base = await staticServer(t);
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.route('**/fonts.googleapis.com/**', route => route.abort());
  await page.goto(`${base}/chatbot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#chatbot-body').count(), 1);
  assert.equal(await page.locator('#chat-input').count(), 1);
  assert.equal(await page.locator('#send-message').count(), 1);
  assert.equal(await page.locator('#chatbot-window').count(), 1);
});

test('chatbot answers navigation questions honestly when AI is down', async t => {
  const express = require('express');
  const { chromium } = require('playwright');
  const app = express(); app.use(express.static('public'));
  // Authenticated session, but the AI provider fails.
  app.post('/api/ai/chat', (req, res) => res.status(503).json({ error: 'AI unavailable' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
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
  await page.waitForFunction(() => [...document.querySelectorAll('#chatbot-body .message.bot')].some(el => el.textContent.includes('courses.html')), null, { timeout: 15000 });
  const reply = await page.locator('#chatbot-body .message.bot').last().innerText();
  assert.match(reply, /unavailable right now/);
  assert.match(reply, /courses\.html/);
  assert.doesNotMatch(reply, /admin/i);
});

test('public certificate verification stays public, private views stay gated', async t => {
  const base = await staticServer(t);
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(`${base}/certificate.html?verify=11111111-1111-4111-8111-111111111111`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.ok(page.url().includes('certificate.html?verify='), `verify link must not redirect, got ${page.url()}`);
  await page.goto(`${base}/certificate.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.ok(page.url().includes('login.html'), `private certificate view must redirect to login, got ${page.url()}`);
});
