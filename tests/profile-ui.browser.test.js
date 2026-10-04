const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

async function fixture(t) {
  const app = express();
  app.use(express.static('public'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    const session = { access_token: 'profile-test-token', user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'asha@example.test' } };
    window.__avatarUploads = [];
    window.supabase = { auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null })
    }, storage: { from: () => ({
      upload: async (path, file, options) => {
        const image = await createImageBitmap(file);
        window.__avatarUploads.push({ path, type: file.type, width: image.width, height: image.height, options });
        image.close();
        return { data: { path }, error: null };
      },
      remove: async () => ({ data: [], error: null }),
      getPublicUrl: path => ({ data: { publicUrl: `https://storage.example.test/${path}` } })
    }) } };
  });
  await context.route('**/cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/api/profile'
      ? { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'asha@example.test', full_name: 'Asha Example', career_goal: 'Data Scientist', avatar_path: null, avatar_url: null, bio: 'Learning data science', preferred_language: null, theme_preference: null }
      : path === '/api/dashboard' ? { user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Asha Example' }, enrollments: [], certificates: [] }
      : path === '/api/courses' ? { courses: [], career_course_mapping: {} }
      : {};
    return route.fulfill({ status: path === '/api/career-test' ? 404 : 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  const page = await context.newPage();
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  await page.goto(`http://127.0.0.1:${server.address().port}/profile.html`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Asha Example').first().waitFor();
  return page;
}

test('profile renders identity, saves editable fields, and stays within supported image limits', async t => {
  const page = await fixture(t);
  assert.equal(await page.locator('#profile-bio-display').innerText(), 'Learning data science');
  await page.locator('#edit-profile-btn').click();
  await page.locator('#profile-bio').fill('Building useful tools');
  let savedBody;
  await page.route('**/api/profile', async route => {
    if (route.request().method() === 'PUT') {
      savedBody = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'asha@example.test', full_name: 'Asha Example', career_goal: 'Data Scientist', bio: savedBody.bio }) });
    }
    return route.continue();
  });
  await page.locator('#profile-edit-form button[type="submit"]').click();
  await page.getByText('Building useful tools').waitFor();
  assert.equal(savedBody.bio, 'Building useful tools');
  assert.deepEqual(await page.evaluate(() => window.CareerPathProfilePhoto.validateProfilePhoto({ type: 'image/svg+xml', size: 40 })), { valid: false, reason: 'type' });
  assert.deepEqual(await page.evaluate(() => window.CareerPathProfilePhoto.validateProfilePhoto({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })), { valid: false, reason: 'size' });
});

test('profile photo crop supports zoom, reposition, square JPEG save, and cancel', async t => {
  const page = await fixture(t);
  const imageData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const context = canvas.getContext('2d');
    context.fillStyle = '#d22'; context.fillRect(0, 0, 400, 400);
    context.fillStyle = '#26c'; context.fillRect(400, 0, 400, 400);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const file = { name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(imageData, 'base64') };

  await page.locator('#profile-avatar-file').setInputFiles(file);
  await page.locator('#avatar-crop-dialog[open]').waitFor();
  await page.locator('#avatar-crop-zoom').fill('1.7');
  const beforeDrag = await page.locator('#avatar-crop-image').evaluate(image => image.style.left);
  const viewport = page.locator('#avatar-crop-viewport');
  const box = await viewport.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await page.mouse.up();
  const after = await page.locator('#avatar-crop-image').evaluate(image => image.style.left);
  await page.route('**/api/profile', async route => {
    if (route.request().method() === 'PUT') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'asha@example.test', full_name: 'Asha Example',
        career_goal: 'Data Scientist', avatar_path: route.request().postDataJSON().avatarPath,
        avatar_url: 'https://storage.example.test/profile-avatars/asha.jpg', bio: 'Learning data science'
      }) });
    }
    return route.fallback();
  });
  await page.locator('#save-avatar-crop-btn').click();
  await page.waitForFunction(() => window.__avatarUploads.length === 1);
  const uploaded = await page.evaluate(() => window.__avatarUploads[0]);
  assert.equal(uploaded.type, 'image/jpeg');
  assert.equal(uploaded.width, 512);
  assert.equal(uploaded.height, 512);
  await page.waitForFunction(() => !document.getElementById('avatar-crop-dialog').open);
  assert.notEqual(after, beforeDrag, 'dragging repositions the crop preview');

  await page.locator('#profile-avatar-file').setInputFiles(file);
  await page.locator('#avatar-crop-dialog[open]').waitFor();
  await page.locator('#cancel-avatar-crop-btn').click();
  assert.equal(await page.locator('#avatar-crop-dialog').evaluate(dialog => dialog.open), false);
  assert.equal(await page.evaluate(() => window.__avatarUploads.length), 1, 'cancel does not upload a file');
});

test('profile has no horizontal overflow at target widths and in Arabic RTL', async t => {
  const page = await fixture(t);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, `horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
  }
  await page.evaluate(async () => {
    localStorage.setItem('aicareer-language', 'ar');
    await window.setCareerPathLanguage('ar');
  });
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  await page.setViewportSize({ width: 390, height: 844 });
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `Arabic RTL horizontal overflow: ${JSON.stringify(dimensions)}`);
});
