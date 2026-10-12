const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchLatestCareerAttempt } = require('../career-assessment-store');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function queryFixture(result, filters) {
  return {
    select() { return this; },
    eq(column, value) { filters.push([column, value]); return this; },
    order() { return this; },
    limit: async () => result
  };
}

test('career assessment lookup returns the newest supplied attempt and scopes completed reads', async () => {
  const filters = [];
  const row = { id: 'attempt-1', completed: true };
  const supabase = { from: table => {
    assert.equal(table, 'career_test_attempts');
    return queryFixture({ data: [row], error: null }, filters);
  } };

  assert.equal(await fetchLatestCareerAttempt(supabase, USER_ID, true), row);
  assert.deepEqual(filters, [['user_id', USER_ID], ['completed', true]]);
});

test('career assessment lookup distinguishes no attempt from a database failure', async () => {
  const empty = { from: () => queryFixture({ data: [], error: null }, []) };
  assert.equal(await fetchLatestCareerAttempt(empty, USER_ID, true), null);

  const databaseFailure = { from: () => queryFixture({ data: null, error: { code: '42P01', message: 'relation missing' } }, []) };
  await assert.rejects(
    () => fetchLatestCareerAttempt(databaseFailure, USER_ID, true),
    error => error.code === 'CAREER_ASSESSMENT_READ_FAILED' && error.cause?.code === '42P01'
  );
});
