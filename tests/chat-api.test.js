const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createChatRouter } = require('../chat-api');

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';

// In-memory chat_history that emulates the real snake_case schema strictly:
// unknown columns (e.g. camelCase userId) fail the write like PostgreSQL would.
const KNOWN_COLUMNS = new Set(['id', 'user_id', 'message', 'response', 'created_at']);

function memorySupabase(rows, failures = {}) {
  const seen = { inserts: [], eqFields: [] };
  return {
    seen,
    from(table) {
      assert.equal(table, 'chat_history');
      const state = { filters: [], pendingDelete: false };
      const apply = () => rows.filter(row => state.filters.every(([field, value]) => row[field] === value));
      const query = {
        insert(row) {
          seen.inserts.push(row);
          const unknown = Object.keys(row).filter(key => !KNOWN_COLUMNS.has(key));
          if (unknown.length > 0) {
            return Promise.resolve({ error: { message: `column "${unknown[0]}" does not exist` } });
          }
          if (failures.insert) return Promise.resolve({ error: { message: 'db down' } });
          rows.push({ id: `row-${rows.length + 1}`, created_at: '2026-01-01T00:00:00Z', ...row });
          return Promise.resolve({ error: null });
        },
        select() { return query; },
        eq(field, value) { seen.eqFields.push(field); state.filters.push([field, value]); return query; },
        order() { return query; },
        limit() { return query; },
        delete() { state.pendingDelete = true; return query; },
        then(resolve, reject) {
          if (state.pendingDelete) {
            if (failures.delete) return Promise.resolve({ error: { message: 'db down' } }).then(resolve, reject);
            const victims = apply();
            victims.forEach(row => rows.splice(rows.indexOf(row), 1));
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          if (failures.select) return Promise.resolve({ data: null, error: { message: 'db down' } }).then(resolve, reject);
          return Promise.resolve({ data: apply(), error: null }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (token === 'Bearer alice') { req.user = { id: alice }; return next(); }
  if (token === 'Bearer bob') { req.user = { id: bob }; return next(); }
  return res.status(401).json({ error: 'Access token required' });
}

const quiet = { log() {}, warn() {}, error() {} };

async function start(t, db, generateReply = async message => `reply to: ${message}`) {
  const app = express(); app.use(express.json());
  app.use('/api', createChatRouter({ supabase: db, authenticateToken: auth, generateReply, logger: quiet }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('saving a chat message uses snake_case columns and reports persistence', async t => {
  const rows = [];
  const db = memorySupabase(rows);
  const base = await start(t, db);
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer alice' },
    body: JSON.stringify({ message: 'hello' })
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: 'reply to: hello', persisted: true });
  assert.deepEqual(db.seen.inserts, [{ user_id: alice, message: 'hello', response: 'reply to: hello' }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, alice);
});

test('missing message is rejected before any database write', async t => {
  const db = memorySupabase([]);
  const base = await start(t, db);
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer alice' },
    body: JSON.stringify({})
  });
  assert.equal(res.status, 400);
  assert.deepEqual(db.seen.inserts, []);
});

test('loading chat history returns only the caller rows with created_at timestamps', async t => {
  const db = memorySupabase([
    { id: 'a1', user_id: alice, message: 'm1', response: 'r1', created_at: '2026-02-01T00:00:00Z' },
    { id: 'b1', user_id: bob, message: 'm2', response: 'r2', created_at: '2026-02-02T00:00:00Z' }
  ]);
  const base = await start(t, db);
  const res = await fetch(`${base}/api/chat/history`, { headers: { Authorization: 'Bearer alice' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    history: [{ message: 'm1', response: 'r1', timestamp: '2026-02-01T00:00:00Z' }]
  });
  assert.deepEqual(db.seen.eqFields, ['user_id']);
});

test('one user cannot access another user history', async t => {
  const db = memorySupabase([
    { id: 'a1', user_id: alice, message: 'm1', response: 'r1', created_at: '2026-02-01T00:00:00Z' }
  ]);
  const base = await start(t, db);
  const res = await fetch(`${base}/api/chat/history`, { headers: { Authorization: 'Bearer bob' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { history: [] });
});

test('clearing chat history removes only the caller rows', async t => {
  const rows = [
    { id: 'a1', user_id: alice, message: 'm1', response: 'r1', created_at: '2026-02-01T00:00:00Z' },
    { id: 'b1', user_id: bob, message: 'm2', response: 'r2', created_at: '2026-02-02T00:00:00Z' }
  ];
  const db = memorySupabase(rows);
  const base = await start(t, db);
  const res = await fetch(`${base}/api/chat/clear`, { method: 'DELETE', headers: { Authorization: 'Bearer alice' } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { message: 'Chat history cleared' });
  assert.deepEqual(rows.map(row => row.id), ['b1']);
  assert.deepEqual(db.seen.eqFields, ['user_id']);
});

test('chat routes require authentication', async t => {
  const base = await start(t, memorySupabase([]));
  assert.equal((await fetch(`${base}/api/ai/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(`${base}/api/chat/history`)).status, 401);
  assert.equal((await fetch(`${base}/api/chat/clear`, { method: 'DELETE' })).status, 401);
});

test('database errors never falsely report successful persistence', async t => {
  const insertDb = memorySupabase([], { insert: true });
  const base = await start(t, insertDb);
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer alice' },
    body: JSON.stringify({ message: 'hello' })
  });
  assert.equal(res.status, 200);
  // Reply still delivered, but persistence is honestly reported as failed.
  assert.deepEqual(await res.json(), { reply: 'reply to: hello', persisted: false });

  const selectBase = await start(t, memorySupabase([], { select: true }));
  const historyRes = await fetch(`${selectBase}/api/chat/history`, { headers: { Authorization: 'Bearer alice' } });
  assert.equal(historyRes.status, 500);
  assert.deepEqual(await historyRes.json(), { error: 'Database error' });

  const deleteBase = await start(t, memorySupabase([], { delete: true }));
  const clearRes = await fetch(`${deleteBase}/api/chat/clear`, { method: 'DELETE', headers: { Authorization: 'Bearer alice' } });
  assert.equal(clearRes.status, 500);
  assert.deepEqual(await clearRes.json(), { error: 'Failed to clear chat history' });
});

test('AI provider failure does not claim a reply', async t => {
  const db = memorySupabase([]);
  const base = await start(t, db, async () => { throw new Error('boom'); });
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer alice' },
    body: JSON.stringify({ message: 'hello' })
  });
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Failed to generate response' });
  assert.deepEqual(db.seen.inserts, []);
});

test('AI quota exhaustion maps to 503 without persisting', async t => {
  const db = memorySupabase([]);
  const base = await start(t, db, async () => { throw { status: 429 }; });
  const res = await fetch(`${base}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer alice' },
    body: JSON.stringify({ message: 'hello' })
  });
  assert.equal(res.status, 503);
  assert.deepEqual(db.seen.inserts, []);
});

test('chat code matches the verified snake_case chat_history schema', () => {
  const fs = require('node:fs');
  const schema = fs.readFileSync('staging_step1.sql', 'utf8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.chat_history \([\s\S]*?user_id UUID REFERENCES auth\.users\(id\) NOT NULL/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.chat_history \([\s\S]*?created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW\(\)/);
  const code = fs.readFileSync('chat-api.js', 'utf8');
  assert.doesNotMatch(code, /userId/);
  assert.doesNotMatch(code, /createdAt/);
  assert.match(code, /user_id: req\.user\.id/);
  assert.match(code, /\.eq\('user_id', req\.user\.id\)/);
  assert.match(code, /timestamp: chat\.created_at/);
});
