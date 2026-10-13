const test = require('node:test');
const assert = require('node:assert/strict');
const { CAREER_ASSESSMENT_DIMENSIONS, CAREER_PROFILE_V1, calculateCareerAssessmentV1 } = require('../career-assessment');

const DIMENSIONS = [
  'Software Engineering',
  'Data & Analytical Thinking',
  'AI & Computational Intelligence',
  'Systems & Infrastructure',
  'Security & Reliability',
  'Product & User Orientation',
  'Design & Human Experience',
  'Leadership & Delivery'
];

function questions(valueByDimension) {
  const rows = [];
  const answers = {};
  DIMENSIONS.forEach((category, d) => {
    for (let i = 0; i < 3; i++) {
      const id = `00000000-0000-4000-8000-${String(d * 3 + i).padStart(12, '0')}`;
      rows.push({ id, category });
      answers[id] = valueByDimension[d];
    }
  });
  return { rows, answers };
}

test('scoring is deterministic and bounded', () => {
  const { rows, answers } = questions([5, 4, 5, 3, 4, 2, 3, 4]);
  const first = calculateCareerAssessmentV1(rows, answers);
  const second = calculateCareerAssessmentV1(rows, answers);
  assert.deepEqual(first, second);
  assert.equal(Object.keys(first.dimensionScores).length, 8);
  for (const score of Object.values(first.dimensionScores)) {
    assert.ok(score >= 0 && score <= 1, `dimension score in bounds: ${score}`);
  }
  assert.equal(first.topCareers.length, 3);
  for (const { score } of first.topCareers) {
    assert.ok(score >= 0 && score <= 100, `career score in bounds: ${score}`);
  }
  assert.equal(first.strengths.length, 3);
});

test('uniform answers rank the closest profile first with stable ties', () => {
  const flat = questions([3, 3, 3, 3, 3, 3, 3, 3]);
  const a = calculateCareerAssessmentV1(flat.rows, flat.answers);
  const b = calculateCareerAssessmentV1(flat.rows, flat.answers);
  assert.deepEqual(a.topCareers.map(c => c.career), b.topCareers.map(c => c.career));
  const maxed = questions([5, 5, 5, 5, 5, 5, 5, 5]);
  const top = calculateCareerAssessmentV1(maxed.rows, maxed.answers).topCareers[0];
  assert.ok(typeof top.career === 'string' && top.score > 0);
});

test('malformed inputs fail loudly instead of persisting NaN', () => {
  const { rows, answers } = questions([5, 4, 5, 3, 4, 2, 3, 4]);
  assert.throws(() => calculateCareerAssessmentV1([], {}), /non-empty/);
  assert.throws(() => calculateCareerAssessmentV1([{ id: 'x', category: 'Nope' }], { x: 3 }), /unsupported/);
  assert.throws(() => calculateCareerAssessmentV1(rows, {}), /Likert/);
  assert.throws(() => calculateCareerAssessmentV1(rows, Object.fromEntries(rows.map(r => [r.id, 6]))), /Likert/);
  const partial = rows.filter(r => r.category !== DIMENSIONS[0]);
  const partialAnswers = Object.fromEntries(partial.map(r => [r.id, 3]));
  assert.throws(() => calculateCareerAssessmentV1(partial, partialAnswers), /no answered questions/);
});

test('profile table covers every dimension exactly once', () => {
  assert.deepEqual(CAREER_ASSESSMENT_DIMENSIONS, DIMENSIONS);
  for (const [career, vector] of Object.entries(CAREER_PROFILE_V1)) {
    assert.equal(vector.length, 8, `${career} must have 8 dimension weights`);
    assert.ok(vector.every(v => v >= 0 && v <= 1), `${career} weights in bounds`);
  }
});
