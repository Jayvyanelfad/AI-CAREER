// Regression coverage for the Introduction to AI & ML final exam seed.
//
// The course-detail page only surfaces a final exam when /api/exams returns a
// row flagged is_final, and certificate issuance is gated on passing that exam.
// The previous seed shipped three placeholder questions and was never wired to
// the course-authored assessment content, so the course could never be finished.
//
// These tests use an in-memory stand-in for Supabase, so they exercise the real
// write plan (including rerun behaviour) without touching any database.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  EXAM_ID, COURSE_ID, PASSING_SCORE, MAX_ATTEMPTS, DURATION_MINUTES, MCQ_QUESTION_COUNT,
  buildExamPlan, examRow, seedIntroToAiFinalExam
} = require('../seed-exam');
const assessment = require('../intro-ai-assessment-content');

// A tiny stand-in for the Supabase query builder. Real supabase-js returns a
// thenable that also chains .select()/.single(), so this mirrors that shape.
function reply(data, error) {
  const value = { data: data ?? null, error: error ?? null, __single: false };
  value.select = () => value;
  // Real supabase resolves .single() with one object and .select() with an array.
  value.single = () => { value.__single = true; return value; };
  // Resolves a plain (non-thenable) snapshot: resolving `value` itself would
  // make the promise machinery unwrap the builder again and recurse forever.
  value.then = resolve => resolve({
    data: value.__single && Array.isArray(value.data) ? (value.data[0] ?? null) : value.data,
    error: value.error
  });
  return value;
}

let nextId = 1;
function memorySupabase() {
  const db = { exams: [], exam_questions: [], exam_options: [] };
  const match = (row, filters) => Object.entries(filters).every(([k, v]) => row[k] === v);
  const apply = (rows, filters) => {
    if (filters.__in) {
      const [column, values] = filters.__in;
      return rows.filter(row => values.includes(row[column]));
    }
    return Object.keys(filters).length ? rows.filter(row => match(row, filters)) : rows;
  };

  return {
    db,
    from(table) {
      const rows = db[table];
      const filters = {};
      let singleMode = false;
      let pendingUpdate = null;

      const api = {
        select(_columns, options) {
          if (options && options.head) return reply([], null);
          return api;
        },
        upsert(values, _options) {
          const list = Array.isArray(values) ? values : [values];
          for (const value of list) {
            const index = rows.findIndex(row => row.id === value.id);
            if (index >= 0) rows[index] = { ...rows[index], ...value };
            else rows.push({ ...value });
          }
          return reply(rows.map(row => ({ ...row })), null);
        },
        insert(values) {
          const inserted = (Array.isArray(values) ? values : [values]).map(value => {
            // Table-scoped id prefixes: a shared counter would let an option id
            // collide with a question id and trip the cascade below.
            const row = { id: value.id || `${table.replace(/[^a-z]/g, '')}-${nextId++}`, ...value };
            rows.push(row);
            return row;
          });
          return reply(inserted.map(row => ({ ...row })), null);
        },
        // Real supabase applies .update() only to the rows matching the filters that
// are chained afterwards, so the write is deferred until the query resolves.
update(values) {
          pendingUpdate = values;
          return api;
        },
        eq(column, value) { filters[column] = value; return api; },
        in(column, values) { filters.__in = [column, values]; return api; },
        // Real supabase resolves .single() with a single object, not an array.
        single() { singleMode = true; return api; },
        then(resolve) {
          if (pendingUpdate) {
            for (const row of apply(rows, filters)) Object.assign(row, pendingUpdate);
            pendingUpdate = null;
          }
          const matched = apply(rows, filters).map(row => ({ ...row }));
          resolve({ data: singleMode ? (matched[0] ?? null) : matched, error: null });
        }
      };
      return api;
    }
  };
}

test('the exam plan is built from the course-authored assessment content', () => {
  const plan = buildExamPlan();
  assert.equal(plan.length, MCQ_QUESTION_COUNT);
  assert.equal(plan.length, 10, 'the final exam contains exactly ten MCQs');
  assert.equal(plan.filter(q => assessment.foundationsQuiz.some(source => source.question === q.question_text)).length, 5);
  assert.equal(plan.filter(q => assessment.finalExamAdditions.some(source => source.question === q.question_text)).length, 5);

  for (const [index, question] of plan.entries()) {
    assert.equal(question.question_order, index + 1, 'questions are ordered deterministically');
    assert.ok(question.question_text.length > 20, 'every question has real prompt text');
    assert.equal(question.options.length, 4, 'every question has four choices');
    const correct = question.options.filter(option => option.is_correct);
    assert.equal(correct.length, 1, `question ${question.question_order} has exactly one correct answer`);
  }

  // The authored content deliberately spreads the correct answer across all four
  // positions. A seed that pinned every answer to option 1 would be a regression.
  const correctPositions = new Set(plan.map(question => question.options.find(option => option.is_correct).option_order));
  assert.equal(correctPositions.size, 4, 'the correct answer is not always in the same position');
});

test('the exam row follows the existing exam conventions', () => {
  const row = examRow();
  assert.equal(row.course_id, COURSE_ID);
  assert.equal(row.passing_score, PASSING_SCORE);
  assert.equal(row.max_attempts, MAX_ATTEMPTS);
  assert.equal(row.duration_minutes, DURATION_MINUTES);
  assert.match(row.title, /\bfinal\s+exam\b/i,
    'the title fallback is how the page and the certificate issuer recognise a final exam');
  assert.equal(row.passing_score, 70, 'passing mark matches the existing course convention');
  assert.ok(row.max_attempts >= 1 && row.max_attempts <= 5);

  // The seed must stay runnable on schemas that predate the flag column, so it
  // may only write long-standing columns.
  assert.equal(row.is_final, undefined, 'the seed does not depend on the newer flag column');
});

test('seeding writes the exam, its questions and exactly one correct option each', async () => {
  const supabase = memorySupabase();
  const result = await seedIntroToAiFinalExam(supabase);

  assert.equal(result.examId, EXAM_ID);
  assert.equal(supabase.db.exams.length, 1);
  assert.equal(supabase.db.exam_questions.length, result.questionCount);
  assert.equal(supabase.db.exam_options.length, result.questionCount * 4);

  for (const question of supabase.db.exam_questions) {
    const options = supabase.db.exam_options.filter(option => option.question_id === question.id);
    assert.equal(options.length, 4, `question ${question.question_order} has four options`);
    assert.equal(options.filter(option => option.is_correct).length, 1,
      `question ${question.question_order} has exactly one correct option`);
  }
});

test('seeding is idempotent and leaves no duplicates on a rerun', async () => {
  const supabase = memorySupabase();
  await seedIntroToAiFinalExam(supabase);
  const first = {
    questions: supabase.db.exam_questions.length,
    options: supabase.db.exam_options.length,
    exam: supabase.db.exams.length
  };

  await seedIntroToAiFinalExam(supabase);
  assert.equal(supabase.db.exams.length, first.exam, 'the exam row is updated, not duplicated');
  assert.equal(supabase.db.exam_questions.length, first.questions, 'questions are reused, not re-inserted');
  assert.equal(supabase.db.exam_options.length, first.options, 'options are reconciled, not appended');
});

test('a previously seeded placeholder answer key is corrected, not preserved', async () => {
  const supabase = memorySupabase();
  // Simulate the old seed: one question whose only correct option is option 2.
  await supabase.from('exams').upsert({ ...examRow() });
  const { data: row } = await supabase.from('exam_questions').insert({
    exam_id: EXAM_ID, question_text: 'What is NLP?', question_order: 1, points: 1
  });
  await supabase.from('exam_options').insert([
    { question_id: row[0].id, option_text: 'Wrong one', option_order: 1, is_correct: false },
    { question_id: row[0].id, option_text: 'Wrong two', option_order: 2, is_correct: false },
    { question_id: row[0].id, option_text: 'Placeholder correct', option_order: 3, is_correct: true }
  ]);

  await seedIntroToAiFinalExam(supabase);

  const first = supabase.db.exam_questions.find(question => question.question_order === 1);
  const options = supabase.db.exam_options.filter(option => option.question_id === first.id);
  assert.equal(options.length, 4);
  assert.equal(options.filter(option => option.is_correct).length, 1);
  assert.ok(!options.some(option => option.option_text === 'Placeholder correct'),
    'the placeholder question is replaced by the authored content');
});

test('the course-detail page only surfaces an exam flagged is_final', () => {
  const detail = fs.readFileSync(path.join(__dirname, '..', 'public', 'course-detail.js'), 'utf8');
  assert.match(detail, /exam\.is_final === true/,
    'the page prefers an explicitly flagged final exam');
  assert.match(detail, /examNotConfigured/,
    'an unconfigured course still says so honestly instead of showing a dead button');
});

test('exam eligibility requires an enrollment and every lesson complete', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /if \(!enrollment\) return 'Enroll in this course before starting its exam\.'/);
  assert.match(server, /if \(progress\.completedLessons < progress\.totalLessons\)/);
  assert.match(server, /submit_exam_attempt/,
    'answers are evaluated on the server, not in the browser');
});

test('new exam attempts are limited to ten MCQs while legacy questions are retained', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /\(eligibilityQuestionIds\.data \|\| \[\]\)\.slice\(0, 10\)/);
  assert.match(server, /Older question\s*\n\s*\/\/ rows remain in the database to preserve historical attempts/);
});
