const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('guided tour performs no network requests by construction', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync('public/tour.js', 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest/);
  assert.doesNotMatch(source, /navigator\.sendBeacon/);
});

async function tourPage(t, { width = 1280, language = 'en' } = {}) {
  const app = express();
  app.use(express.static('public'));
  const apiCalls = [];
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(lang => {
    localStorage.setItem('aicareer-language', lang);
  }, language);
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/fonts.googleapis.com/**', route => route.abort());
  const page = await context.newPage();
  page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') apiCalls.push(`${request.method()} ${request.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}/tour.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#tour-stage').waitFor();
  return { page, apiCalls };
}

test('guided tour walks six steps with next, back, restart, and exit', async t => {
  const { page, apiCalls } = await tourPage(t);
  const label = page.locator('#tour-step-label');
  await page.waitForFunction(() => document.getElementById('tour-step-label')?.textContent.includes('1 of 6'));
  assert.match(await page.locator('#tour-stage h2').innerText(), /sample assessment/i);
  for (let step = 2; step <= 6; step++) {
    await page.locator('#tour-next').click();
    await page.waitForFunction(n => document.getElementById('tour-step-label')?.textContent.includes(`${n} of 6`), step);
  }
  assert.match(await page.locator('#tour-stage h2').innerText(), /sample certificate/i);
  assert.match(await page.locator('.tour-cert-watermark').innerText(), /sample/i);
  assert.equal(await page.locator('#tour-next').isDisabled(), true);
  await page.locator('#tour-back').click();
  await page.waitForFunction(() => document.getElementById('tour-step-label')?.textContent.includes('5 of 6'));
  await page.locator('#tour-restart').click();
  await page.waitForFunction(() => document.getElementById('tour-step-label')?.textContent.includes('1 of 6'));
  await page.locator('#tour-exit').click();
  await page.waitForURL('**/index.html', { timeout: 10000 });
  assert.deepEqual(apiCalls, [], 'tour must never write backend data');
});

test('tour practice exam gives feedback and completes without recording', async t => {
  const { page, apiCalls } = await tourPage(t);
  for (let i = 0; i < 4; i++) await page.locator('#tour-next').click();
  await page.waitForFunction(() => document.getElementById('tour-step-label')?.textContent.includes('5 of 6'));
  await page.locator('input[name="tour-exam-0"][value="0"]').check();
  await page.locator('input[name="tour-exam-1"][value="0"]').check();
  await page.locator('#tour-check').click();
  const first = await page.locator('#tour-feedback-0').innerText();
  assert.match(first, /correct/i);
  assert.equal(await page.locator('#tour-feedback-0').getAttribute('data-state'), 'correct');
  const second = await page.locator('#tour-feedback-1').innerText();
  assert.match(second, /not quite/i);
  await page.waitForFunction(() => document.getElementById('tour-exam-done')?.textContent.includes('1 of 3'));
  assert.deepEqual(apiCalls, [], 'practice exam is checked locally only');
});

test('tour renders mobile and Arabic RTL without overflow', async t => {
  const { page } = await tourPage(t, { width: 390, language: 'ar' });
  assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl');
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'ar');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  assert.ok(overflow, 'no horizontal overflow in Arabic mobile layout');
  for (let i = 0; i < 5; i++) await page.locator('#tour-next').click();
  await page.waitForFunction(() => document.getElementById('tour-step-label') !== null);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  assert.ok(mobileOverflow, 'no horizontal overflow on the final step');
});
