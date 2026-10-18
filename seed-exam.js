// Seeds the Introduction to AI & ML final exam.
//
// Why this exists: the course-detail page only offers the final exam when
// /api/exams?course_id=intro_to_ai returns an exam it recognises as final, and
// certificate issuance is gated on passing that exam. Until the row exists the
// page correctly says "No final exam has been configured for this course yet",
// and the whole course-completion chain stays closed.
//
// The questions are NOT invented here. They are the course-authored assessment
// content that already ships in this repository:
//   intro-ai-assessment-content.js -> foundationsQuiz    (10 questions)
//   intro-ai-assessment-content.js -> finalExamAdditions (10 questions)
// Together they cover every module of intro-to-ai-course-content.js.
//
// The script is idempotent: rerunning it updates the exam row in place and
// reconciles questions and options instead of appending duplicates.
//
// It deliberately writes only long-standing columns, never the newer
// final-exam flag, so it runs both before and after that column's backfill
// migration. The existing API recognises the exam by its "Final Exam" title
// on either schema.
//
// Usage (requires service-role credentials):
//   $env:SUPABASE_URL='...' ; $env:SUPABASE_SERVICE_ROLE_KEY='...' ; node seed-exam.js
//
// It only ever writes the exam for the intro_to_ai course. It never touches
// learners, attempts, grades or certificates.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const assessment = require('./intro-ai-assessment-content');

// Stable primary key. `exams.id` is TEXT, and reusing the historical id keeps
// any existing attempt rows pointing at the same exam.
const EXAM_ID = 'intro_to_ai_exam_1';
const COURSE_ID = 'intro_to_ai';

// Matches the conventions already used by the exam API: an integer percentage,
// a bounded number of attempts, and the schema's 60-minute default duration.
const PASSING_SCORE = 70;
const MAX_ATTEMPTS = 3;
const DURATION_MINUTES = 60;

// Builds the complete, ordered question plan from the course-authored content.
// Pure and side-effect free so it can be asserted in tests without a database.
function buildExamPlan() {
  const source = [...assessment.foundationsQuiz, ...assessment.finalExamAdditions];
  if (!source.length) throw new Error('intro-ai-assessment-content.js produced no questions');

  return source.map((entry, index) => {
    const options = entry.options || [];
    if (options.length < 2) {
      throw new Error(`Question ${index + 1} has fewer than two options`);
    }
    if (!Number.isInteger(entry.correct) || entry.correct < 0 || entry.correct >= options.length) {
      throw new Error(`Question ${index + 1} has an out-of-range correct index`);
    }
    return {
      question_order: index + 1,
      question_text: entry.question,
      points: 1,
      options: options.map((text, optionIndex) => ({
        option_text: text,
        option_order: optionIndex + 1,
        is_correct: optionIndex === entry.correct
      }))
    };
  });
}

function examRow() {
  return {
    id: EXAM_ID,
    course_id: COURSE_ID,
    // The "Final Exam" wording is what both the course-detail page and the
    // certificate issuer use to recognise this as the course's final exam.
    title: 'Introduction to AI & ML Final Exam',
    description: 'Final exam covering every module of Introduction to AI & ML, including AI foundations, machine-learning fundamentals, neural networks, real-world applications and building a first AI project.',
    passing_score: PASSING_SCORE,
    max_attempts: MAX_ATTEMPTS,
    duration_minutes: DURATION_MINUTES
  };
}

// Returns an existing exam row when one already holds these questions, so a
// rerun never duplicates the exam.
async function upsertExam(supabase, log) {
  const examData = examRow();
  const { data, error } = await supabase
    .from('exams')
    .upsert(examData, { onConflict: 'id' })
    .select();

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No exam data returned');
  const examRecord = data[0];
  log(`Exam ready: ${examRecord.id} (${examRecord.title})`);
  return examRecord;
}

async function seedIntroToAiFinalExam(supabase, log = () => {}) {
  const plan = buildExamPlan();
  const examRecord = await upsertExam(supabase, log);

  // Existing question orders are reused so reruns never duplicate rows or
  // orphan the options already attached to them.
  const { data: existingQuestions, error: existingError } = await supabase
    .from('exam_questions')
    .select('id, question_order')
    .eq('exam_id', examRecord.id);
  if (existingError) throw existingError;
  const questionIdByOrder = new Map((existingQuestions || []).map(row => [row.question_order, row.id]));

  let writtenQuestions = 0;
  for (const question of plan) {
    let questionId = questionIdByOrder.get(question.question_order);

    if (questionId) {
      const { error } = await supabase
        .from('exam_questions')
        .update({ question_text: question.question_text, points: question.points })
        .eq('id', questionId);
      if (error) throw error;
    } else {
      const { data, error: questionError } = await supabase
        .from('exam_questions')
        .insert({ exam_id: examRecord.id, ...question })
        .select('id')
        .single();
      if (questionError) {
        // A concurrent seed run won the unique (exam_id, question_order)
        // race: fall back to the winning row instead of duplicating it.
        if (questionError.code === '23505') {
          const { data: winner } = await supabase
            .from('exam_questions')
            .select('id')
            .eq('exam_id', examRecord.id)
            .eq('question_order', question.question_order)
            .maybeSingle();
          if (winner) {
            questionId = winner.id;
          } else {
            throw questionError;
          }
        } else {
          throw questionError;
        }
      } else {
        questionId = data.id;
        log(`  + question ${question.question_order}`);
      }
    }

    // Options are owned by this seed and are reconciled in place: an existing
    // row for a given option_order is corrected, and only genuinely missing
    // options are inserted. Nothing is ever deleted, so a rerun cannot remove
    // data it did not write.
    const { data: existingOptions, error: optionsReadError } = await supabase
      .from('exam_options')
      .select('id, option_order, option_text, is_correct')
      .eq('question_id', questionId);
    if (optionsReadError) throw optionsReadError;

    const existingByOrder = new Map((existingOptions || []).map(option => [option.option_order, option]));
    for (const expected of question.options) {
      const current = existingByOrder.get(expected.option_order);
      if (!current) {
        const { error } = await supabase
          .from('exam_options')
          .insert({ question_id: questionId, ...expected });
        if (error) throw error;
        continue;
      }
      if (current.option_text === expected.option_text && current.is_correct === expected.is_correct) continue;
      const { error } = await supabase
        .from('exam_options')
        .update({ option_text: expected.option_text, is_correct: expected.is_correct })
        .eq('id', current.id);
      if (error) throw error;
    }

    // Extra options left by an older seed would be scored against nothing.
    // Removing them is a destructive write, so they are reported for a human
    // to review instead of being silently dropped.
    const extraOptions = (existingOptions || [])
      .filter(option => !question.options.some(expected => expected.option_order === option.option_order));
    if (extraOptions.length) {
      log(`  ! question ${question.question_order} has ${extraOptions.length} option(s) outside this seed; review them manually`);
    }
    writtenQuestions++;
  }

  // A stale extra question from an older, longer seed would be counted by the
  // exam API and scored against nothing. Removing it is a destructive write,
  // so it is reported for review rather than deleted.
  const staleOrders = (existingQuestions || [])
    .map(row => row.question_order)
    .filter(order => !plan.some(question => question.question_order === order));
  if (staleOrders.length) {
    log(`! ${staleOrders.length} question order(s) exist outside this seed (${staleOrders.join(', ')}); review them manually`);
  }

  log(`Seeded ${writtenQuestions} questions with answers and options for ${COURSE_ID}.`);
  return { examId: examRecord.id, courseId: COURSE_ID, questionCount: plan.length };
}

module.exports = {
  EXAM_ID,
  COURSE_ID,
  PASSING_SCORE,
  MAX_ATTEMPTS,
  DURATION_MINUTES,
  buildExamPlan,
  examRow,
  seedIntroToAiFinalExam
};

if (require.main === module) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase URL or service role key in .env');
    process.exit(1);
  }
  seedIntroToAiFinalExam(createClient(url, key), line => console.log(line))
    .then(result => {
      console.log('\nExam seeding completed successfully!');
      console.log(`Exam ID: ${result.examId}`);
      console.log(`Course ID: ${result.courseId}`);
      console.log(`Questions: ${result.questionCount}`);
    })
    .catch(error => {
      console.error('Exam seeding failed:', error);
      process.exit(1);
    });
}