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
  await page.goto(`${base}/chatbot.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#chatbot-body').count(), 1);
  assert.equal(await page.locator('#chat-input').count(), 1);
  assert.equal(await page.locator('#send-message').count(), 1);
  assert.equal(await page.locator('#chatbot-window').count(), 1);
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
