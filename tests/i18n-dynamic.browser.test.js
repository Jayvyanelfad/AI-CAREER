const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

async function startStaticServer(t) {
  const app = express();
  app.get('/i18n-fixture.html', (_req, res) => res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><script src="/i18n.js"></script></head>
<body><header><nav><a data-i18n="nav.home" data-i18n-fallback="Home">Home</a></nav></header>
<main><div id="dynamic-root"></div><section id="results-container" style="display:none"><div class="dashboard-header"><p class="editorial-eyebrow" data-i18n="careerResult.eyebrow">YOUR CAREER DIRECTION</p><h1><span data-i18n="careerResult.title">Your Career Direction</span></h1></div></section></main></body></html>`));
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('explicitly keyed elements inserted after load use the selected locale', async t => {
  const base = await startStaticServer(t);
  const browser = await chromium.launch({ headless: true });
  t.after(async () => browser.close().catch(() => {}));
  const page = await browser.newPage();
  await page.goto(`${base}/i18n-fixture.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.setCareerPathLanguage === 'function' && window.getCareerPathLanguage() === 'en');
  await page.evaluate(async () => {
    await window.setCareerPathLanguage('fr');
    const item = document.createElement('button');
    item.dataset.i18n = 'common.loading';
    item.dataset.i18nFallback = 'Loading...';
    item.textContent = 'Loading...';
    item.id = 'inserted-translation';
    document.getElementById('dynamic-root').appendChild(item);
  });
  await page.waitForFunction(() => document.getElementById('inserted-translation')?.textContent !== 'Loading...');
  assert.equal(await page.locator('#inserted-translation').innerText(), 'Chargement...');
  await page.evaluate(() => window.setCareerPathLanguage('en'));
  await page.waitForFunction(() => document.getElementById('inserted-translation')?.textContent === 'Loading...');
  assert.equal(await page.locator('#inserted-translation').innerText(), 'Loading...');
  assert.equal(await page.evaluate(() => localStorage.getItem('aicareer-language')), 'en');
});

test('career result heading stays below navigation at desktop and mobile widths', async t => {
  const base = await startStaticServer(t);
  const browser = await chromium.launch({ headless: true });
  t.after(async () => browser.close().catch(() => {}));
  const page = await browser.newPage();
  await page.goto(`${base}/career-test.html`, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: `
    body.career-test-page > header { position:relative!important; inset:auto!important; display:flex!important; flex-wrap:wrap!important; height:auto!important; }
    body.career-test-page > header nav { position:static!important; display:flex!important; flex-wrap:wrap!important; }
    #results-container { display:block!important; position:relative!important; margin-top:48px!important; }
    #results-container > .dashboard-header { position:relative!important; }
  ` });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.setCareerPathLanguage?.('wo'));
    await page.waitForTimeout(80);
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('body.career-test-page > header');
      const title = document.querySelector('#results-container h1');
      const nav = header?.querySelector('nav');
      const h = header?.getBoundingClientRect();
      const n = nav?.getBoundingClientRect();
      const t = title?.getBoundingClientRect();
      return { headerBottom: h?.bottom, navBottom: n?.bottom, titleTop: t?.top, titleBottom: t?.bottom, viewport: innerWidth };
    });
    assert.ok(geometry.titleTop >= geometry.headerBottom, `result title overlaps header at ${width}px: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.titleTop >= geometry.navBottom, `result title overlaps nav at ${width}px: ${JSON.stringify(geometry)}`);
  }
});
