const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple exam data for intro_to_ai course
const examData = {
  id: 'intro_to_ai_exam_1',
  course_id: 'intro_to_ai',
  title: 'Introduction to AI & ML Final Exam',
  description: 'Final exam covering all modules of the Introduction to AI & ML course',
  passing_score: 70,
  max_attempts: 3
};

// Sample questions for the exam
const questions = [
  {
    question_text: 'What is Artificial Intelligence?',
    question_order: 1,
    points: 1,
    options: [
      { option_text: 'A type of traditional programming', option_order: 1, is_correct: false },
      { option_text: 'Systems designed to perform tasks that typically require human intelligence', option_order: 2, is_correct: true },
      { option_text: 'Only refers to physical robots', option_order: 3, is_correct: false },
      { option_text: 'A database technology', option_order: 4, is_correct: false }
    ]
  },
  {
    question_text: 'Which of the following is NOT a type of machine learning?',
    question_order: 2,
    points: 1,
    options: [
      { option_text: 'Supervised learning', option_order: 1, is_correct: false },
      { option_text: 'Unsupervised learning', option_order: 2, is_correct: false },
      { option_text: 'Reinforcement learning', option_order: 3, is_correct: false },
      { option_text: 'Database learning', option_order: 4, is_correct: true }
    ]
  },
  {
    question_text: 'What does NLP stand for?',
    question_order: 3,
    points: 1,
    options: [
      { option_text: 'Natural Language Processing', option_order: 1, is_correct: true },
      { option_text: 'Neural Language Programming', option_order: 2, is_correct: false },
      { option_text: 'Natural Laser Processing', option_order: 3, is_correct: false },
      { option_text: 'Network Language Protocol', option_order: 4, is_correct: false }
    ]
  }
];

async function seedExam() {
  console.log('Starting exam seeding...');

  try {
    // Idempotent exam write: the stable id is reused across reruns and the
    // row is updated in place instead of failing on primary-key conflict.
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .upsert(examData, { onConflict: 'id' })
      .select();

    if (examError) {
      console.error('Error inserting exam:', examError);
      process.exit(1);
    }

    if (!exam || exam.length === 0) {
      console.error('No exam data returned');
      process.exit(1);
    }

    const examRecord = exam[0];
    console.log(`Upserted exam: ${examRecord.title} with ID: ${examRecord.id}`);

    // Existing question orders are reused so reruns never duplicate rows or
    // orphan the options already attached to them.
    const { data: existingQuestions, error: existingError } = await supabase
      .from('exam_questions')
      .select('id, question_order')
      .eq('exam_id', examRecord.id);
    if (existingError) {
      console.error('Error reading existing exam questions:', existingError);
      process.exit(1);
    }
    const questionIdByOrder = new Map((existingQuestions || []).map(row => [row.question_order, row.id]));

    // Insert questions and options
    for (const questionData of questions) {
      let questionId = questionIdByOrder.get(questionData.question_order);
      if (!questionId) {
        const { data: question, error: questionError } = await supabase
          .from('exam_questions')
          .insert({
            exam_id: examRecord.id,
            question_text: questionData.question_text,
            question_order: questionData.question_order,
            points: questionData.points
          })
          .select();
        if (questionError) {
          // A concurrent seed run won the unique (exam_id, question_order)
          // race: fall back to the winning row instead of duplicating it.
          if (questionError.code === '23505') {
            const { data: winner } = await supabase
              .from('exam_questions')
              .select('id')
              .eq('exam_id', examRecord.id)
              .eq('question_order', questionData.question_order)
              .maybeSingle();
            if (winner) {
              questionId = winner.id;
              console.log(`  Reusing existing question order ${questionData.question_order}`);
            } else {
              console.error(`Error inserting question "${questionData.question_text}":`, questionError);
              continue;
            }
          } else {
            console.error(`Error inserting question "${questionData.question_text}":`, questionError);
            continue;
          }
        } else if (!question || question.length === 0) {
          console.error(`No question data returned for "${questionData.question_text}"`);
          continue;
        } else {
          questionId = question[0].id;
          console.log(`  Inserted question: ${question[0].question_text}`);
        }
      } else {
        console.log(`  Reusing existing question order ${questionData.question_order}`);
      }

      // Fill options only when the question has none, so interrupted reruns
      // complete partial work instead of duplicating options.
      const { data: existingOptions, error: optionsReadError } = await supabase
        .from('exam_options')
        .select('id')
        .eq('question_id', questionId);
      if (optionsReadError) {
        console.error(`    Error reading options for question order ${questionData.question_order}:`, optionsReadError);
        continue;
      }
      if (existingOptions && existingOptions.length > 0) {
        console.log(`    Reusing ${existingOptions.length} existing options`);
        continue;
      }

      // Insert options for this question
      for (const optionData of questionData.options) {
        const { error: optionError } = await supabase
          .from('exam_options')
          .insert({
            question_id: questionId,
            option_text: optionData.option_text,
            option_order: optionData.option_order,
            is_correct: optionData.is_correct
          });

        if (optionError) {
          console.error(`    Error inserting option "${optionData.option_text}":`, optionError);
          continue;
        }

        console.log(`    Inserted option: ${optionData.option_text} (${optionData.is_correct ? 'correct' : 'incorrect'})`);
      }
    }

    console.log('\nExam seeding completed successfully!');
    console.log(`Exam ID: ${examRecord.id}`);
    console.log(`Course ID: ${examRecord.course_id}`);

  } catch (err) {
    console.error('Error during exam seeding:', err);
    process.exit(1);
  }
}

seedExam().catch(err => {
  console.error('Exam seeding failed:', err);
  process.exit(1);
});