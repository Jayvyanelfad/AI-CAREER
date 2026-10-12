const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Career test questions for the MCQ assessment
const questions = [
  {
    question_text: 'Which of the following best describes your approach to solving complex problems?',
    category: 'problem_solving',
    order_number: 1,
    options: [
      { option_value: 'analytical', option_text: 'I break problems down into smaller parts and analyze each systematically' },
      { option_value: 'creative', option_text: 'I prefer to think outside the box and come up with innovative solutions' },
      { option_value: 'practical', option_text: 'I focus on finding quick, workable solutions that get the job done' },
      { option_value: 'collaborative', option_text: 'I like to discuss with others and gather different perspectives' }
    ]
  },
  {
    question_text: 'When learning a new technical skill, what motivates you the most?',
    category: 'learning_style',
    order_number: 2,
    options: [
      { option_value: 'career_growth', option_text: 'Advancing my career and increasing my earning potential' },
      { option_value: 'curiosity', option_text: 'Personal interest and enjoyment of learning new things' },
      { option_value: 'application', option_text: 'Being able to apply the skill to real-world projects immediately' },
      { option_value: 'recognition', option_text: 'Gaining recognition from peers or supervisors for my expertise' }
    ]
  },
  {
    question_text: 'Which type of work environment do you thrive in?',
    category: 'work_preference',
    order_number: 3,
    options: [
      { option_value: 'structured', option_text: 'A well-defined role with clear expectations and processes' },
      { option_value: 'flexible', option_text: 'An environment that allows for creativity and changing priorities' },
      { option_value: 'independent', option_text: 'Working autonomously with minimal supervision' },
      { option_value: 'team_oriented', option_text: 'Collaborating closely with a team toward shared goals' }
    ]
  },
  {
    question_text: 'How do you prefer to receive feedback on your work?',
    category: 'communication',
    order_number: 4,
    options: [
      { option_value: 'direct', option_text: 'Straightforward, specific comments about what I did well and what needs improvement' },
      { option_value: 'encouraging', option_text: 'Positive reinforcement mixed with constructive suggestions' },
      { option_value: 'data_driven', option_text: 'Feedback based on metrics, data, and measurable outcomes' },
      { option_value: 'conversational', option_text: 'Open dialogue where we discuss strengths and areas for growth' }
    ]
  },
  {
    question_text: 'Which aspect of technology excites you the most?',
    category: 'tech_interests',
    order_number: 5,
    options: [
      { option_value: 'building', option_text: 'Creating new applications, websites, or software from scratch' },
      { option_value: 'analyzing', option_text: 'Working with data to uncover insights and patterns' },
      { option_value: 'securing', option_text: 'Protecting systems and data from threats and vulnerabilities' },
      { option_value: 'optimizing', option_text: 'Making systems faster, more efficient, and more reliable' }
    ]
  },
  {
    question_text: 'When faced with a tight deadline, what is your typical approach?',
    category: 'work_ethic',
    order_number: 6,
    options: [
      { option_value: 'plan_first', option_text: 'I create a detailed plan and stick to it to ensure timely completion' },
      { option_value: 'adapt', option_text: 'I adjust my approach as needed while keeping the end goal in mind' },
      { option_value: 'focus_essential', option_text: 'I prioritize the most critical tasks and let less important ones wait' },
      { option_value: 'seek_help', option_text: 'I ask for assistance or delegate tasks to meet the deadline' }
    ]
  },
  {
    question_text: 'What role do you typically take in group projects?',
    category: 'team_role',
    order_number: 7,
    options: [
      { option_value: 'leader', option_text: 'I often take charge, organize the team, and drive progress' },
      { option_value: 'idea_generator', option_text: 'I contribute creative ideas and think of innovative approaches' },
      { option_value: 'organizer', option_text: 'I handle logistics, scheduling, and keeping everyone on track' },
      { option_value: 'supporter', option_text: 'I help others with their tasks and maintain team morale' }
    ]
  },
  {
    question_text: 'How important is work-life balance to you in your career choices?',
    category: 'values',
    order_number: 8,
    options: [
      { option_value: 'essential', option_text: 'Non-negotiable - I need clear boundaries between work and personal life' },
      { option_value: 'important', option_text: 'Very important, but I can be flexible when needed for important projects' },
      { option_value: 'moderate', option_text: 'I value it, but career growth and achievement are priorities too' },
      { option_value: 'flexible', option_text: 'I\'m willing to sacrifice balance temporarily for the right opportunities' }
    ]
  },
  {
    question_text: 'Which describes your attitude toward continuous learning in your field?',
    category: 'growth_mindset',
    order_number: 9,
    options: [
      { option_value: 'enthusiastic', option_text: 'I actively seek out new learning opportunities and enjoy the process' },
      { option_value: 'practical', option_text: 'I learn what\'s necessary to do my job well and advance my career' },
      { option_value: 'selective', option_text: 'I focus on learning skills that directly apply to my current goals' },
      { option_value: 'minimal', option_text: 'I prefer to master what I know rather than constantly learning new things' }
    ]
  },
  {
    question_text: 'When evaluating a job opportunity, what matters most to you?',
    category: 'job_priorities',
    order_number: 10,
    options: [
      { option_value: 'impact', option_text: 'The ability to make a meaningful difference or create positive change' },
      { option_value: 'growth', option_text: 'Opportunities for professional development and advancement' },
      { option_value: 'stability', option_text: 'Job security, reliable income, and long-term prospects' },
      { option_value: 'culture', option_text: 'A positive work environment that aligns with my values' }
    ]
  },
  {
    question_text: 'How do you typically handle unexpected changes in a project?',
    category: 'adaptability',
    order_number: 11,
    options: [
      { option_value: 'embrace', option_text: 'I see changes as opportunities to improve and innovate' },
      { option_value: 'manage', option_text: 'I assess the impact and adjust plans accordingly' },
      { option_value: 'resist', option_text: 'I prefer to stick to the original plan when possible' },
      { option_value: 'delegate', option_text: 'I let others handle the changes while I focus on my responsibilities' }
    ]
  },
  {
    question_text: 'What type of projects do you find most fulfilling?',
    category: 'project_preference',
    order_number: 12,
    options: [
      { option_value: 'helping_others', option_text: 'Projects that directly help people or solve social problems' },
      { option_value: 'technical_challenge', option_text: 'Complex technical problems that require deep expertise' },
      { option_value: 'visible_results', option_text: 'Projects where I can see tangible results quickly' },
      { option_value: 'long_term_vision', option_text: 'Strategic projects that build toward a future vision' }
    ]
  }
];

async function seedCareerTestQuestions() {
  console.log('Starting career test questions seeding...');

  try {
    // First, deactivate any existing questions to avoid duplicates
    const { error: deactivateError } = await supabase
      .from('questions')
      .update({ active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Don't update a fake ID

    if (deactivateError) {
      console.warn('Note: Could not deactivate existing questions (may be first run):', deactivateError.message);
    }

    // Insert questions and their options
    for (const questionData of questions) {
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          question_text: questionData.question_text,
          category: questionData.category,
          order_number: questionData.order_number,
          active: true
        })
        .select();

      if (questionError) {
        console.error(`Error inserting question "${questionData.question_text}":`, questionError);
        continue;
      }

      if (!question || question.length === 0) {
        console.error(`No question data returned for "${questionData.question_text}"`);
        continue;
      }

      const questionRecord = question[0];
      console.log(`Inserted question: ${questionRecord.question_text}`);

      // Insert options for this question
      for (const optionData of questionData.options) {
        const { error: optionError } = await supabase
          .from('question_options')
          .insert({
            question_id: questionRecord.id,
            option_value: optionData.option_value,
            option_text: optionData.option_text
          });

        if (optionError) {
          console.error(`    Error inserting option "${optionData.option_text}":`, optionError);
          continue;
        }

        console.log(`    Inserted option: ${optionData.option_text}`);
      }
    }

    console.log('\nCareer test questions seeding completed successfully!');

  } catch (err) {
    console.error('Error during career test questions seeding:', err);
    process.exit(1);
  }
}

seedCareerTestQuestions().catch(err => {
  console.error('Career test questions seeding failed:', err);
  process.exit(1);
});