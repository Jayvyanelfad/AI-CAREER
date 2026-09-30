const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createProfileRouter, parseProfileUpdates, profileResponse } = require('../profile-api');

const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('profile input accepts supported fields and rejects unsafe or invalid values', () => {
  assert.deepEqual(parseProfileUpdates({ fullName: ' Asha ', bio: ' Hello ', preferredLanguage: 'ar', themePreference: 'dark' }, USER_ID), {
    updates: { full_name: 'Asha', bio: 'Hello', preferred_language: 'ar', theme_preference: 'dark' }
  });
  assert.equal(parseProfileUpdates({ id: OTHER_ID, fullName: 'Asha' }, USER_ID).error, 'Unsupported profile field');
  assert.equal(parseProfileUpdates({ preferredLanguage: 'fon' }, USER_ID).error, 'Unsupported language preference');
  assert.equal(parseProfileUpdates({ themePreference: 'blue' }, USER_ID).error, 'Unsupported theme preference');
  assert.equal(parseProfileUpdates({ bio: 'x'.repeat(241) }, USER_ID).error, 'Bio must be 240 characters or fewer');
  assert.equal(parseProfileUpdates({ fullName: ' ' }, USER_ID).error, 'Name must be 1 to 100 characters');
  assert.equal(parseProfileUpdates({ avatarPath: `${OTHER_ID}/12345678-1234-1234-1234-123456789abc.jpg` }, USER_ID).error, 'Invalid avatar reference');
  assert.equal(parseProfileUpdates({ avatarPath: `${USER_ID}/12345678-1234-1234-1234-123456789abc.svg` }, USER_ID).error, 'Invalid avatar reference');
  assert.equal(parseProfileUpdates({ avatarPath: null }, USER_ID).updates.avatar_path, null);
});

test('profile response contains public display fields only and uses the public bucket URL', () => {
  const url = 'https://storage.example.test/profile-avatars/photo.jpg';
  const response = profileResponse({ storage: { from: bucket => ({ getPublicUrl: path => ({ data: { publicUrl: `${url}?path=${path}` } }) }) } },
    { id: USER_ID, email: 'asha@example.test' }, { full_name: 'Asha', avatar_path: 'photo.jpg', bio: 'Hello' });
  assert.equal(response.avatar_url, `${url}?path=photo.jpg`);
  assert.equal(response.bio, 'Hello');
  assert.equal(Object.hasOwn(response, 'password'), false);
  assert.equal(Object.hasOwn(response, 'answers'), false);
});

test('profile routes require authentication and use only the verified subject as row ID', async t => {
  const calls = [];
  let row = { id: USER_ID, full_name: 'Asha', career_goal: 'undecided' };
  const supabase = {
    from(table) {
      assert.equal(table, 'users');
      return {
        select() { return this; },
        update(payload) { calls.push({ type: 'update', payload }); return this; },
        insert(payload) { calls.push({ type: 'insert', payload }); return this; },
        eq(key, value) { calls.push({ type: 'eq', key, value }); return this; },
        maybeSingle: async () => ({ data: row, error: null }),
        single: async () => ({ data: (row = { ...row, ...calls.at(-1).payload }), error: null })
      };
    },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: null } }) }) }
  };
  const app = express();
  app.use(express.json());
  const authenticateToken = (req, res, next) => {
    if (req.headers.authorization !== 'Bearer verified') return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: USER_ID, email: 'asha@example.test' };
    next();
  };
  app.use('/api/profile', createProfileRouter({ supabase, authenticateToken }));
  const server = createServer(app).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const anonymous = await fetch(`${origin}/api/profile`);
  assert.equal(anonymous.status, 401);
  const payloadWithForeignId = await fetch(`${origin}/api/profile`, {
    method: 'PUT', headers: { authorization: 'Bearer verified', 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Asha', id: OTHER_ID })
  });
  assert.equal(payloadWithForeignId.status, 400);
  const saved = await fetch(`${origin}/api/profile`, {
    method: 'PUT', headers: { authorization: 'Bearer verified', 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'New Asha' })
  });
  assert.equal(saved.status, 200);
  assert.ok(calls.some(call => call.type === 'eq' && call.key === 'id' && call.value === USER_ID));
  assert.equal(calls.some(call => call.type === 'eq' && call.value === OTHER_ID), false);
  assert.equal(calls.find(call => call.type === 'update').payload.full_name, 'New Asha');
});
