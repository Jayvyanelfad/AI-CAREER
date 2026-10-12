const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('seed-exam.js is idempotent and migration-safe', () => {
  const seed = fs.readFileSync('seed-exam.js', 'utf8');
  // Stable exam id reused across reruns instead of failing on PK conflict.
  assert.match(seed, /\.upsert\(examData, \{ onConflict: 'id' \}\)/);
  // Existing question orders are reused, preserving row UUIDs and options.
  assert.match(seed, /questionIdByOrder/);
  assert.match(seed, /\.eq\('exam_id', examRecord\.id\)/);
  // Concurrent-seed unique conflicts recover to the winning row.
  assert.match(seed, /questionError\.code === '23505'/);
  // Interrupted reruns complete missing options instead of duplicating them.
  assert.match(seed, /existingOptions/);
  // The seed writes only long-standing columns, so it runs both before and
  // after the is_final discriminator migration (which backfills by exam id).
  assert.doesNotMatch(seed, /is_final/);
  // No destructive statements.
  assert.doesNotMatch(seed, /\.delete\(|DROP TABLE|TRUNCATE/);
});
