const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

const PAGES = ['index.html', 'courses.html', 'course-detail.html', 'career-test.html', 'dashboard.html', 'programming.html', 'profile.html', 'tour.html'];

async function harness(t, { width = 1280, language = 'en' } = {}) {
  const app = express();
  app.use(express.static('public'));
  app.post('/api/ai/chat', (req, res) => res.status(503).json({ error: 'AI unavailable' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(lang => {
    localStorage.setItem('token', 't');
    localStorage.setItem('aicareer-language', lang);
    window.supabase = { auth: {
      getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'u1' } } }, error: null }),
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } };
  }, language);
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  return { context, base: `http://127.0.0.1:${server.address().port}` };
}

test('chatbot launcher appears exactly once on every intended page', async t => {
  const { context, base } = await harness(t);
  for (const pageName of PAGES) {
    const page = await context.newPage();
    await page.goto(`${base}/${pageName}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('#chatbot').count(), 1, `${pageName} has one widget root`);
    assert.equal(await page.locator('[data-chatbot-open]').count(), 1, `${pageName} has one launcher`);
    assert.equal(await page.locator('#chatbot-window').count(), 1, `${pageName} has one panel`);
    await page.close();
  }
  await context.close();
});

test('launcher opens the dialog, Escape closes it, focus is managed', async t => {
  const { context, base } = await harness(t);
  const page = await context.newPage();
  await page.goto(`${base}/courses.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
  const launcher = page.locator('[data-chatbot-open]');
  assert.equal(await launcher.getAttribute('aria-expanded'), 'false');
  await launcher.click();
  const panel = page.locator('#chatbot-window');
  assert.equal(await panel.getAttribute('role'), 'dialog');
  assert.equal(await launcher.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'chat-input');
  await page.keyboard.press('Escape');
  assert.equal(await launcher.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('Assistant') ?? false), true);
  await context.close();
});

test('quick question through the widget yields platform guidance', async t => {
  const { context, base } = await harness(t);
  const page = await context.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.locator('[data-chatbot-open]').click();
  await page.locator('#chat-input').fill('where are the courses?');
  await page.locator('#send-message').click();
  await page.waitForFunction(() => [...document.querySelectorAll('#chatbot-body .message.bot')].some(el => el.textContent.includes('courses.html')), null, { timeout: 15000 });
  await context.close();
});

test('widget respects mobile layout, French locale, and Arabic RTL', async t => {
  const { context, base } = await harness(t, { width: 390, language: 'fr' });
  const page = await context.newPage();
  const warnings = [];
  page.on('console', message => { if (message.type() === 'warning' && message.text().includes('[i18n]')) warnings.push(message.text()); });
  await page.goto(`${base}/courses.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  assert.deepEqual(warnings, [], `no i18n warnings: ${warnings.slice(0, 3).join(' | ')}`);
  const launcherBox = await page.locator('[data-chatbot-open]').boundingBox();
  assert.ok(launcherBox.x + launcherBox.width <= 390, 'launcher stays inside mobile viewport');
  await page.locator('[data-chatbot-open]').click();
  const panelBox = await page.locator('#chatbot-window').boundingBox();
  assert.ok(panelBox.width <= 390 && panelBox.x >= 0, 'panel fits mobile viewport');
  await context.close();

  const rtl = await harness(t, { width: 390, language: 'ar' });
  const arPage = await rtl.context.newPage();
  await arPage.goto(`${rtl.base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await arPage.waitForTimeout(1500);
  assert.equal(await arPage.evaluate(() => document.documentElement.dir), 'rtl');
  const arBox = await arPage.locator('[data-chatbot-open]').boundingBox();
  assert.ok(arBox.x < 390 / 2, 'launcher mirrors to the inline-end side in RTL');
  await rtl.context.close();
});

test('widget welcome re-localizes after language change', async t => {
  const { context, base } = await harness(t);
  const page = await context.newPage();
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.setCareerPathLanguage && window.setCareerPathLanguage('pcm'));
  await page.waitForFunction(() => [...document.querySelectorAll('#chatbot-body .message.bot')].some(el => /Wetin you wan know/.test(el.textContent)), null, { timeout: 15000 });
  const launcherText = await page.locator('[data-chatbot-open]').innerText();
  assert.match(launcherText, /AI Assistant/);
  await context.close();
});

test('signed-out follow-ups explain login once instead of repeating', async t => {
  const { context, base } = await harness(t);
  const page = await context.newPage();
  await page.goto(`${base}/courses.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => localStorage.removeItem('token'));
  await page.locator('[data-chatbot-open]').click();
  for (const text of ['hello?', 'are you there?', 'help with courses']) {
    await page.locator('#chat-input').fill(text);
    await page.locator('#send-message').click();
    await page.waitForTimeout(400);
  }
  const loginWarnings = await page.evaluate(() =>
    [...document.querySelectorAll('#chatbot-body .message.bot')]
      .filter(el => /log in first/i.test(el.textContent)).length);
  assert.equal(loginWarnings, 1, 'login requirement is stated once across follow-ups');
  await context.close();
});

test('a second Chatbot instance does not duplicate handlers or welcomes', async t => {
  const { context, base } = await harness(t);
  const page = await context.newPage();
  await page.goto(`${base}/courses.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1200);
  const welcomesBefore = await page.evaluate(() =>
    [...document.querySelectorAll('#chatbot-body .message.bot')].length);
  await page.evaluate(() => { new Chatbot(); });
  await page.waitForTimeout(500);
  const welcomesAfter = await page.evaluate(() =>
    [...document.querySelectorAll('#chatbot-body .message.bot')].length);
  assert.equal(welcomesAfter, welcomesBefore, 'no duplicate welcome on double init');
  await page.locator('[data-chatbot-open]').click();
  await page.locator('#chat-input').fill('where are the courses?');
  await page.locator('#send-message').click();
  await page.waitForTimeout(800);
  const userEchoes = await page.evaluate(() =>
    [...document.querySelectorAll('#chatbot-body .message.user')]
      .filter(el => el.textContent.includes('where are the courses?')).length);
  assert.equal(userEchoes, 1, 'one send produces exactly one user message');
  await context.close();
});
