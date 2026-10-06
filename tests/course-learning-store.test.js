const test = require('node:test');
const assert = require('node:assert/strict');
const { createCourseLearningStore } = require('../course-learning-store');

function mockSupabase({ modules, lessons, progress, errors = {} }) {
  return {
    from(table) {
      const query = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        order() { return this; },
        then(resolve, reject) {
          return Promise.resolve({
            data: errors[table] ? null : ({ modules, lessons, lesson_progress: progress })[table],
            error: errors[table] || null
          }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

const lessons = Array.from({ length: 10 }, (_, index) => ({
  id: `lesson-${index + 1}`,
  title: `Lesson ${index + 1}`,
  duration_minutes: 30
}));

async function summaryFor(completedIds) {
  const store = createCourseLearningStore(mockSupabase({
    modules: [{ id: 'module-1' }],
    lessons,
    progress: completedIds.map(lesson_id => ({ lesson_id }))
  }));
  return store.getProgressSummary('user-1', 'course-1');
}

test('progress uses unique persisted lesson IDs and rounds 0/N, 1/N, middle, N-1/N, and N/N', async () => {
  const none = await summaryFor([]);
  assert.equal(none.progress, 0);
  assert.equal(none.completedLessons, 0);

  const one = await summaryFor(['lesson-1']);
  assert.equal(one.progress, 10);
  assert.equal(one.completedLessons, 1);

  const middle = await summaryFor(lessons.slice(0, 5).map(lesson => lesson.id));
  assert.equal(middle.progress, 50);
  assert.equal(middle.completedLessons, 5);

  const allButOne = await summaryFor(lessons.slice(0, -1).map(lesson => lesson.id));
  assert.equal(allButOne.progress, 90);
  assert.equal(allButOne.completedLessons, 9);

  const all = await summaryFor([...lessons.map(lesson => lesson.id), 'lesson-1']);
  assert.equal(all.progress, 100);
  assert.equal(all.completedLessons, 10);
  assert.equal(new Set(all.completedLessonIds).size, 10);
});

test('a valid course with no modules or lessons has zero progress', async () => {
  const noModules = createCourseLearningStore(mockSupabase({ modules: [], lessons: [], progress: [] }));
  assert.deepEqual(await noModules.getProgressSummary('user-1', 'empty-course'), {
    completedLessonIds: [],
    totalLessons: 0,
    completedLessons: 0,
    progress: 0,
    completedHours: 0,
    nextLessonTitle: null
  });

  const noLessons = createCourseLearningStore(mockSupabase({
    modules: [{ id: 'module-1' }],
    lessons: [],
    progress: []
  }));
  assert.equal((await noLessons.getProgressSummary('user-1', 'empty-course')).progress, 0);
});

test('module, lesson, and progress query failures propagate instead of becoming empty progress', async () => {
  const databaseError = new Error('database unavailable');

  for (const [table, setup] of [
    ['modules', { modules: null, lessons: [], progress: [] }],
    ['lessons', { modules: [{ id: 'module-1' }], lessons: null, progress: [] }],
    ['lesson_progress', { modules: [{ id: 'module-1' }], lessons, progress: null }]
  ]) {
    const store = createCourseLearningStore(mockSupabase({
      ...setup,
      errors: { [table]: databaseError }
    }));
    await assert.rejects(store.getProgressSummary('user-1', 'course-1'), databaseError, table);
  }
});
