const test = require('node:test');
const assert = require('node:assert/strict');
const { recoverConcurrentEnrollment } = require('../enrollment-store');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('only a unique-key conflict with the matching learner/course row recovers as a duplicate enrollment', async () => {
  const filters = [];
  const supabase = {
    from(table) {
      assert.equal(table, 'enrollments');
      const query = {
        select() { return query; },
        eq(column, value) { filters.push([column, value]); return query; },
        maybeSingle: async () => ({ data: { id: 'existing-enrollment' }, error: null })
      };
      return query;
    }
  };

  assert.deepEqual(
    await recoverConcurrentEnrollment(supabase, { userId: USER_ID, courseId: 'intro_to_ai', insertError: { code: '23505' } }),
    { recovered: true, error: null }
  );
  assert.deepEqual(filters, [['user_id', USER_ID], ['course_id', 'intro_to_ai']]);
  assert.deepEqual(
    await recoverConcurrentEnrollment(supabase, { userId: USER_ID, courseId: 'intro_to_ai', insertError: { code: '23503' } }),
    { recovered: false, error: null }
  );
});

test('a unique-key conflict is not masked when the matching enrollment cannot be read', async () => {
  const databaseError = { code: '42501', message: 'permission denied' };
  const supabase = { from: () => ({
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: null, error: databaseError })
  }) };
  assert.deepEqual(
    await recoverConcurrentEnrollment(supabase, { userId: USER_ID, courseId: 'intro_to_ai', insertError: { code: '23505' } }),
    { recovered: false, error: databaseError }
  );
});

test('enrollment uniqueness migration validates existing rows before creating the unique index', () => {
  const migration = require('node:fs').readFileSync('migrations/20261011_enrollment_uniqueness.sql', 'utf8');
  assert.match(migration, /user_id is null or course_id is null/i);
  assert.match(migration, /group by user_id, course_id/i);
  assert.match(migration, /having count\(\*\) > 1/i);
  assert.match(migration, /create unique index if not exists enrollments_user_course_unique_idx/i);
});
