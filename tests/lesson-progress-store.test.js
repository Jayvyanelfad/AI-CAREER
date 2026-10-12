const test = require('node:test');
const assert = require('node:assert/strict');
const { persistLessonCompletion } = require('../lesson-progress-store');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LESSON_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMPLETED_AT = '2026-10-11T12:00:00.000Z';

test('lesson completion updates an existing learner progress row', async () => {
  const calls = [];
  const query = {
    select() { return query; },
    eq() { return query; },
    maybeSingle: async () => ({ data: { id: 'progress-id' }, error: null })
  };
  const supabase = {
    from: () => ({
      ...query,
      update(payload) { calls.push(payload); return { eq: async () => ({ error: null }) }; }
    })
  };

  const result = await persistLessonCompletion(supabase, { userId: USER_ID, lessonId: LESSON_ID, completedAt: COMPLETED_AT });
  assert.deepEqual(result, { error: null, operation: 'update' });
  assert.deepEqual(calls, [{ completed: true, completed_at: COMPLETED_AT, updated_at: COMPLETED_AT }]);
});

test('lesson completion recovers when an identical concurrent insert wins', async () => {
  const calls = [];
  let fromCalls = 0;
  const supabase = {
    from(table) {
      assert.equal(table, 'lesson_progress');
      fromCalls += 1;
      if (fromCalls === 1) {
        const read = { select() { return read; }, eq() { return read; }, maybeSingle: async () => ({ data: null, error: null }) };
        return read;
      }
      if (fromCalls === 2) return { insert: async () => ({ error: { code: '23505' } }) };
      return {
        update(payload) { calls.push(payload); return this; },
        eq(key, value) { calls.push([key, value]); return this; },
        then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); }
      };
    }
  };

  const result = await persistLessonCompletion(supabase, { userId: USER_ID, lessonId: LESSON_ID, completedAt: COMPLETED_AT });
  assert.deepEqual(result, { error: null, operation: 'concurrent-update' });
  assert.deepEqual(calls, [
    { completed: true, completed_at: COMPLETED_AT, updated_at: COMPLETED_AT },
    ['user_id', USER_ID],
    ['lesson_id', LESSON_ID]
  ]);
});

test('lesson completion does not mask an unexpected insert error as an idempotent success', async () => {
  const databaseError = { code: '23503', message: 'foreign key violation' };
  let fromCalls = 0;
  const supabase = {
    from() {
      fromCalls += 1;
      if (fromCalls === 1) {
        const read = { select() { return read; }, eq() { return read; }, maybeSingle: async () => ({ data: null, error: null }) };
        return read;
      }
      return { insert: async () => ({ error: databaseError }) };
    }
  };
  assert.deepEqual(
    await persistLessonCompletion(supabase, { userId: USER_ID, lessonId: LESSON_ID, completedAt: COMPLETED_AT }),
    { error: databaseError, operation: 'insert' }
  );
});
