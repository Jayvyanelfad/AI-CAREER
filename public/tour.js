// Guided sample tour of the CareerPath AI learner journey.
//
// Demonstration only. Every value rendered here is local sample data declared
// in this file. The tour opens no network connection, reads no learner record,
// and creates or modifies no enrollment, lesson progress, exam attempt or
// certificate. Controls inside the stage are handled by delegated listeners
// bound exactly once at start-up, so re-rendering can never duplicate handlers
// and never discards the visitor's choices: all state lives in `state`.
(function () {
  'use strict';

  const t = (key, fallback, vars) => (window.t ? window.t(key, fallback, vars) : (fallback || key));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

  /* ------------------------------------------------------------------ *
   * Sample data. Career labels and catalog ids below are copied from the
   * project's own course-catalog-config.json so the tour never invents a
   * destination. Course titles are this tour's sample labels: the live
   * catalog owns the real title, level and duration.
   * ------------------------------------------------------------------ */

  const TOTAL = 6;

  const STEPS = [
    { nameKey: 'tour.stepNames.interests', name: 'Discover interests' },
    { nameKey: 'tour.stepNames.courses', name: 'Recommended courses' },
    { nameKey: 'tour.stepNames.enroll', name: 'Enrollment' },
    { nameKey: 'tour.stepNames.lesson', name: 'Try a lesson' },
    { nameKey: 'tour.stepNames.quiz', name: 'Practice quiz' },
    { nameKey: 'tour.stepNames.finish', name: 'Celebrate and continue' }
  ];

  // Deterministic sample scoring. Each option of each question awards points
  // to one or more directions; the highest total wins. `DIRECTIONS` order is
  // also the documented tie-break order, and the score table is shown to the
  // visitor so the outcome is fully explainable.
  // Points are whole numbers, so the score needs a singular form.
function pointsLabel(points) {
  return points === 1
    ? t('tour.s1point', '{points} point', { points })
    : t('tour.s1points', '{points} points', { points });
}

const DIRECTIONS = [
    {
      id: 'data',
      nameKey: 'tour.dir.data', name: 'Data Analyst',
      whyKey: 'tour.dirWhy.data', why: 'You keep returning to patterns, evidence and clear answers — that is data work.',
      strengths: [['tour.strength.data1', 'Reading a dataset without jumping to conclusions'], ['tour.strength.data2', 'Explaining a finding in plain language']],
      skills: [['tour.skill.data1', 'Spreadsheet and query fundamentals'], ['tour.skill.data2', 'Data cleaning and validation']],
      courses: ['data_analytics_basics', 'python_for_careers', 'prompt_engineering']
    },
    {
      id: 'aiMl',
      nameKey: 'tour.dir.aiMl', name: 'AI/ML Engineer',
      whyKey: 'tour.dirWhy.aiMl', why: 'You are drawn to systems that learn from examples and improve when they get something wrong.',
      strengths: [['tour.strength.aiMl1', 'Staying curious while a model keeps failing'], ['tour.strength.aiMl2', 'Breaking a vague goal into a measurable one']],
      skills: [['tour.skill.aiMl1', 'Python for data work'], ['tour.skill.aiMl2', 'Evaluating model output honestly']],
      courses: ['intro_to_ai', 'advanced_ml', 'generative_ai_llm']
    },
    {
      id: 'software',
      nameKey: 'tour.dir.software', name: 'Software Developer',
      whyKey: 'tour.dirWhy.software', why: 'You think in steps and test cases — you want to build something that actually works.',
      strengths: [['tour.strength.software1', 'Debugging methodically instead of guessing'], ['tour.strength.software2', 'Keeping a promise the product makes']],
      skills: [['tour.skill.software1', 'Programming fundamentals'], ['tour.skill.software2', 'Version control and debugging']],
      courses: ['python_for_careers', 'web_dev', 'dsa']
    },
    {
      id: 'design',
      nameKey: 'tour.dir.design', name: 'UI/UX Designer',
      whyKey: 'tour.dirWhy.design', why: 'You notice how an experience feels to the person using it, not only how it is built.',
      strengths: [['tour.strength.design1', 'Reading a screen as a sequence of decisions'], ['tour.strength.design2', 'Defending a choice with user needs']],
      skills: [['tour.skill.design1', 'Interface design fundamentals'], ['tour.skill.design2', 'User research basics']],
      courses: ['ui_ux', 'web_dev', 'prompt_engineering']
    }
  ];

  const QUESTIONS = [
    {
      key: 'q1',
      textKey: 'tour.q1.text', text: 'A problem looks confusing. What do you reach for first?',
      options: [
        { labelKey: 'tour.q1.a', label: 'Split it into smaller pieces and test each one', points: { software: 2 } },
        { labelKey: 'tour.q1.b', label: 'Look for the pattern in the numbers and what they predict', points: { data: 2, aiMl: 1 } },
        { labelKey: 'tour.q1.c', label: 'Work out how the person using it actually feels', points: { design: 2 } }
      ]
    },
    {
      key: 'q2',
      textKey: 'tour.q2.text', text: 'Which kind of work sounds most satisfying?',
      options: [
        { labelKey: 'tour.q2.a', label: 'Tuning a system until it stops making silly mistakes', points: { aiMl: 3 } },
        { labelKey: 'tour.q2.b', label: 'Turning a messy pile of records into one clear answer', points: { data: 2 } },
        { labelKey: 'tour.q2.c', label: 'Shipping something other people use every day', points: { software: 2, design: 1 } }
      ]
    },
    {
      key: 'q3',
      textKey: 'tour.q3.text', text: 'Pick the sentence you would rather be able to finish.',
      options: [
        { labelKey: 'tour.q3.a', label: 'A study that states clearly which factor caused what', points: { data: 2, aiMl: 1 } },
        { labelKey: 'tour.q3.b', label: 'A product someone can hold and understand at a glance', points: { design: 2 } },
        { labelKey: 'tour.q3.c', label: 'A tool that stays fast, reliable and never breaks', points: { software: 2 } }
      ]
    }
  ];

  // Catalog ids verified against course-catalog-config.json. `category` is the
  // verified catalog category; level and duration are intentionally omitted
  // because they live in the live catalog and are not read by this tour.
  const COURSES = {
    data_analytics_basics: { nameKey: 'tour.course.data_analytics_basics', name: 'Data Analytics Basics', categoryKey: 'tour.cat.data', category: 'Data' },
    python_for_careers: { nameKey: 'tour.course.python_for_careers', name: 'Python for Career Development', categoryKey: 'tour.cat.software', category: 'Software Engineering' },
    prompt_engineering: { nameKey: 'tour.course.prompt_engineering', name: 'Prompt Engineering', categoryKey: 'tour.cat.aiAutomation', category: 'AI Building & Automation' },
    intro_to_ai: { nameKey: 'tour.course.intro_to_ai', name: 'Introduction to AI & ML', categoryKey: 'tour.cat.aiMl', category: 'AI & Machine Learning' },
    advanced_ml: { nameKey: 'tour.course.advanced_ml', name: 'Advanced Machine Learning', categoryKey: 'tour.cat.aiMl', category: 'AI & Machine Learning' },
    generative_ai_llm: { nameKey: 'tour.course.generative_ai_llm', name: 'Generative AI and LLMs', categoryKey: 'tour.cat.aiMl', category: 'AI & Machine Learning' },
    web_dev: { nameKey: 'tour.course.web_dev', name: 'Web Development Fundamentals', categoryKey: 'tour.cat.software', category: 'Software Engineering' },
    dsa: { nameKey: 'tour.course.dsa', name: 'Data Structures and Algorithms', categoryKey: 'tour.cat.software', category: 'Software Engineering' },
    ui_ux: { nameKey: 'tour.course.ui_ux', name: 'UI/UX Design', categoryKey: 'tour.cat.design', category: 'Design & Product' }
  };

  // Verified on the server: enrolling requires an account, only works for
  // courses whose status is `available`, and returns the existing enrollment
  // instead of creating a duplicate.
  const ENROLLMENT_UNLOCKS = [
    ['tour.s3unlock1', 'The course page offers its final exam — without an enrollment there is no exam link at all.'],
    ['tour.s3unlock2', 'Your place appears on the dashboard with a progress bar and a "continue learning" shortcut.'],
    ['tour.s3unlock3', 'Completed lessons are stored against your account and counted towards certificate eligibility.'],
    ['tour.s3unlock4', 'A certificate can be requested later — but only once the remaining rules are met too.']
  ];

  // Verified on the server in certificate-api.js. Every rule below is enforced
  // server-side; the browser cannot satisfy them on its own.
  const ELIGIBILITY = [
    ['tour.eligEnrolled', 'You are enrolled in that course'],
    ['tour.eligLessons', 'Every lesson in the course is marked complete'],
    ['tour.eligExam', 'The course has exactly one configured final exam'],
    ['tour.eligPassed', 'Your latest submitted attempt at that final exam is passed'],
    ['tour.eligName', 'Your profile carries a real name'],
    ['tour.eligServer', 'The server checks all of this — a browser cannot award one']
  ];

  const SAMPLE_LESSONS_TOTAL = 3;

  const EXAM_ITEMS = [
    {
      textKey: 'tour.s5q1.text', text: 'Which language defines the structure of a web page?',
      options: [
        { labelKey: 'tour.s5q1.a', label: 'HTML' },
        { labelKey: 'tour.s5q1.b', label: 'CSS' },
        { labelKey: 'tour.s5q1.c', label: 'JavaScript' }
      ],
      answer: 0,
      whyKey: 'tour.s5q1.why', why: 'HTML markup describes the document structure; CSS styles it and JavaScript drives its behaviour.'
    },
    {
      textKey: 'tour.s5q2.text', text: 'Who is able to award a course certificate?',
      options: [
        { labelKey: 'tour.s5q2.a', label: 'The server, after verifying every requirement' },
        { labelKey: 'tour.s5q2.b', label: 'This tour, at the end of the walkthrough' },
        { labelKey: 'tour.s5q2.c', label: 'The learner’s own browser' }
      ],
      answer: 0,
      whyKey: 'tour.s5q2.why', why: 'Only the server writes certificate records. Neither a tour nor a browser can issue one.'
    },
    {
      textKey: 'tour.s5q3.text', text: 'What does 2 + 2 × 2 evaluate to?',
      options: [
        { labelKey: 'tour.s5q3.a', label: '8' },
        { labelKey: 'tour.s5q3.b', label: '4' },
        { labelKey: 'tour.s5q3.c', label: '6' }
      ],
      answer: 2,
      whyKey: 'tour.s5q3.why', why: 'Multiplication binds tighter than addition, so this is 2 + (2 × 2) = 6.'
    }
  ];

  const SAMPLE_LESSON_CHALLENGE = {
    promptKey: 'tour.s4q', prompt: 'A friend gives you 200 photos, each marked "cat" or "dog". What does the model actually do with them?',
    options: [
      { labelKey: 'tour.s4a', label: 'A person writes the rules by hand, one photo at a time' },
      { labelKey: 'tour.s4b', label: 'It adjusts its own internal settings until it separates the two kinds of photo' },
      { labelKey: 'tour.s4c', label: 'It memorises those exact photos and cannot use anything new' }
    ],
    answer: 1,
    whyKey: 'tour.s4why', why: 'Training nudges the model’s internal settings down whenever it guesses wrong, so it improves on photos it has never seen.'
  };

  /* ------------------------------------------------------------------ *
   * State. Nothing here is persisted and nothing here leaves the page.
   * ------------------------------------------------------------------ */

  const state = {
    step: 0,
    answers: {},      // question index -> chosen option index
    direction: null,  // resolved direction id
    enrolled: false,  // sample enrollment
    lessonAnswer: undefined, // the learner's own lesson-challenge choice
    lessonChecked: false,   // has the current choice been marked yet?
    lessonSolved: false,
    quiz: {},         // question index -> chosen option index
    quizSubmitted: false
  };

  function resetState() {
    state.step = 0;
    state.answers = {};
    state.direction = null;
    state.enrolled = false;
    state.lessonAnswer = undefined;
    state.lessonChecked = false;
    state.lessonSolved = false;
    state.quiz = {};
    state.quizSubmitted = false;
  }

  /* ------------------------------------------------------------------ *
   * Sample recommendation logic (deterministic and fully shown).
   * ------------------------------------------------------------------ */

  function directionScores() {
    const totals = {};
    DIRECTIONS.forEach(direction => { totals[direction.id] = 0; });
    QUESTIONS.forEach((question, questionIndex) => {
      const chosen = state.answers[questionIndex];
      if (chosen === undefined) return;
      const option = question.options[chosen];
      if (!option) return;
      Object.keys(option.points).forEach(id => { totals[id] = (totals[id] || 0) + option.points[id]; });
    });
    return totals;
  }

  function allAnswered() {
    return QUESTIONS.every((_question, index) => state.answers[index] !== undefined);
  }

  function resolveDirection() {
    if (!allAnswered()) return null;
    const totals = directionScores();
    // Strictly greater keeps DIRECTIONS order as the documented tie-break.
    let best = null;
    DIRECTIONS.forEach(direction => {
      if (best === null || totals[direction.id] > totals[best]) best = direction.id;
    });
    return best;
  }

  function directionById(id) {
    return DIRECTIONS.find(direction => direction.id === id) || null;
  }

  function recommendedCourses(directionId) {
    const direction = directionById(directionId);
    return direction ? direction.courses : [];
  }

  /* ------------------------------------------------------------------ *
   * Rendering helpers. Every interpolated value is escaped, and every value
   * originates from the constants above or from `state` (option indexes and
   * computed numbers only), so no visitor-supplied string reaches innerHTML.
   * ------------------------------------------------------------------ */

  function sampleBadge() {
    return `<span class="tour-sample-badge">${esc(t('tour.sampleBadge', 'Sample demonstration only'))}</span>`;
  }

  function heading(id, key, fallback) {
    return `<h2 id="${id}" class="tour-step-title" tabindex="-1">${esc(t(key, fallback))}</h2>`;
  }

  function optionList(items, name, checkedValue, describedBy) {
    return `<div class="tour-options" role="radiogroup"${describedBy ? ` aria-describedby="${describedBy}"` : ''}>${items.map((item, index) => `
      <label class="tour-option">
        <input type="radio" name="${esc(name)}" value="${index}"${checkedValue === index ? ' checked' : ''} />
        <span class="tour-option-text">${esc(item.label)}</span>
      </label>`).join('')}</div>`;
  }

  function meter(percent, label) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    return `<span class="tour-meter" role="img" aria-label="${esc(label)}"><span style="width:${safePercent}%"></span></span>`;
  }

  /* ------------------------------ step 1 ------------------------------ */

  function renderStepInterests() {
    const questions = QUESTIONS.map((question, questionIndex) => `
      <fieldset class="tour-block">
        <legend class="tour-block-title">
          <span class="tour-question-number">${esc(t('tour.s1question', 'Question {current} of {total}', { current: questionIndex + 1, total: QUESTIONS.length }))}</span>
          <span>${esc(t(question.textKey, question.text))}</span>
        </legend>
        ${optionList(question.options.map(option => ({ label: t(option.labelKey, option.label) })), `tour-sample-q${questionIndex}`, state.answers[questionIndex])}
      </fieldset>`).join('');

    const direction = directionById(state.direction);
    const totals = directionScores();
    const maxTotal = DIRECTIONS.reduce((best, d) => Math.max(best, totals[d.id] || 0), 0);

    let result = `<p class="tour-hint">${esc(t('tour.s1pending', 'Answer all three questions to see the sample result.'))}</p>`;

    if (direction) {
      const scoreRows = DIRECTIONS.map(candidate => {
        const points = totals[candidate.id] || 0;
        const isWinner = candidate.id === direction.id;
        return `<li class="tour-score${isWinner ? ' is-active' : ''}">
          <span class="tour-score-name">${esc(t(candidate.nameKey, candidate.name))}</span>
          ${meter(maxTotal ? (points / maxTotal) * 100 : 0, pointsLabel(points))}
          <span class="tour-score-value">${esc(pointsLabel(points))}</span>
        </li>`;
      }).join('');

      const evidence = QUESTIONS.map((question, questionIndex) => {
        const chosen = state.answers[questionIndex];
        const option = question.options[chosen];
        return `<li><span class="tour-evidence-q">${esc(t(question.textKey, question.text))}</span><span class="tour-evidence-a">${esc(t(option.labelKey, option.label))}</span></li>`;
      }).join('');

      result = `
        <div class="tour-result" id="tour-result">
          <div class="tour-result-head">
            <h3 class="tour-result-title">${esc(t('tour.s1resultTitle', 'Sample direction: {direction}', { direction: t(direction.nameKey, direction.name) }))}</h3>
            <p class="tour-result-note">${esc(t('tour.s1resultNote', 'Illustrative only — real results come from your full assessment.'))}</p>
          </div>
          <p class="tour-result-why">${esc(t(direction.whyKey, direction.why))}</p>
          <div class="tour-columns">
            <div class="tour-col">
              <h4>${esc(t('tour.s1strengthsTitle', 'Strengths this path leans on'))}</h4>
              <ul class="tour-list">${direction.strengths.map(([key, fallback]) => `<li>${esc(t(key, fallback))}</li>`).join('')}</ul>
            </div>
            <div class="tour-col">
              <h4>${esc(t('tour.s1skillsTitle', 'Skills to build next'))}</h4>
              <ul class="tour-list">${direction.skills.map(([key, fallback]) => `<li>${esc(t(key, fallback))}</li>`).join('')}</ul>
            </div>
          </div>
          <details class="tour-details">
            <summary>${esc(t('tour.s1howTitle', 'Show how this sample result was calculated'))}</summary>
            <h5>${esc(t('tour.s1scoresTitle', 'Points awarded to each direction'))}</h5>
            <ul class="tour-scores">${scoreRows}</ul>
            <h5>${esc(t('tour.s1evidenceTitle', 'Your answers'))}</h5>
            <ul class="tour-evidence">${evidence}</ul>
            <p class="tour-footnote">${esc(t('tour.s1tieBreak', 'Highest total wins. Ties are broken in the fixed order: {order}.', { order: DIRECTIONS.map(d => t(d.nameKey, d.name)).join(', ') }))}</p>
          </details>
        </div>`;
    }

    return `${sampleBadge()}
      ${heading('tour-step-title', 'tour.s1title', 'Sample assessment — discover your interests')}
      <p class="tour-lede">${esc(t('tour.s1intro', 'Three short practice questions. The real assessment adapts to a much longer question set.'))}</p>
      <p class="tour-disclaimer">${esc(t('tour.s1disclaimer', 'This demonstration is not a validated psychometric assessment. No score is calculated, stored or shared.'))}</p>
      ${questions}
      ${result}
      <p class="tour-cta"><a class="tour-cta-link" href="career-test.html">${esc(t('tour.openTest', 'Open the real career test'))} <span aria-hidden="true">→</span></a></p>
      <p class="tour-account-note">${esc(t('tour.accountNote', 'CareerPath AI asks you to sign in, or create a free account, before you can take the real assessment.'))}</p>`;
  }

  /* ------------------------------ step 2 ------------------------------ */

  function renderStepCourses() {
    const direction = directionById(state.direction);
    const courseIds = recommendedCourses(state.direction);

    if (!direction || !courseIds.length) {
      return `${sampleBadge()}
        ${heading('tour-step-title', 'tour.s2title', 'Recommended courses for your sample direction')}
        <p class="tour-hint">${esc(t('tour.s2pending', 'Go back and answer the sample assessment to build a course list.'))}</p>`;
    }

    const cards = courseIds.map(courseId => {
      const course = COURSES[courseId];
      return `<li class="tour-course">
        <div class="tour-course-head">
          <h4 class="tour-course-title">${esc(t(course.nameKey, course.name))}</h4>
          <span class="tour-tag">${esc(t(course.categoryKey, course.category))}</span>
        </div>
        <p class="tour-course-id">${esc(t('tour.s2idLabel', 'Catalog ID'))}: <code>${esc(courseId)}</code></p>
        <p class="tour-course-why">${esc(t(`tour.fit.${direction.id}.${courseId}`, 'Recommended for this sample direction.'))}</p>
        <p class="tour-cta"><a class="tour-cta-link" href="course-detail.html?id=${encodeURIComponent(courseId)}">${esc(t('tour.openCourse', 'Open course page'))} <span aria-hidden="true">→</span></a></p>
      </li>`;
    }).join('');

    return `${sampleBadge()}
      ${heading('tour-step-title', 'tour.s2title', 'Recommended courses for your sample direction')}
      <p class="tour-lede">${esc(t('tour.s2intro', 'The real catalog recommends courses from your saved assessment results.'))}</p>
      <p class="tour-context">${esc(t('tour.s2basedOn', 'Built from your sample direction: {direction}', { direction: t(direction.nameKey, direction.name) }))}</p>
      <ul class="tour-courses">
        ${cards}
        <li class="tour-course is-sample" id="tour-sample-course">
          <div class="tour-course-head">
            <h4 class="tour-course-title">${esc(t('tour.sampleCourseName', 'Applied AI Studio'))}</h4>
            <span class="tour-sample-badge">${esc(t('tour.sampleCourseBadge', 'Sample card'))}</span>
          </div>
          <p class="tour-course-why">${esc(t('tour.sampleCourseNote', 'An illustrative card with no destination in the real catalog, so there is deliberately no link here.'))}</p>
        </li>
      </ul>
      <p class="tour-footnote">${esc(t('tour.s2levelNote', 'Names above are this tour\'s sample labels. Level, duration and the official title live in the live catalog.'))}</p>
      <p class="tour-account-note">${esc(t('tour.accountNote', 'CareerPath AI asks you to sign in, or create a free account, before you can open the catalog.'))}</p>`;
  }

  /* ------------------------------ step 3 ------------------------------ */

  function renderStepEnroll() {
    const courseId = recommendedCourses(state.direction)[0] || 'intro_to_ai';
    const course = COURSES[courseId] || COURSES.intro_to_ai;

    const stateBlock = state.enrolled
      ? `<div class="tour-state is-after" id="tour-enroll-state" data-enrolled="true">
          <p class="tour-state-title">${esc(t('tour.s3after', 'Sample state: enrolled (demo only)'))}</p>
          <p class="tour-state-detail">${esc(t('tour.s3afterDetail', 'Nothing was sent anywhere. This switch only changed the page in front of you.'))}</p>
        </div>
        <p><button type="button" class="tour-button is-ghost" id="tour-enroll-toggle">${esc(t('tour.s3undoBtn', 'Reset sample enrollment'))}</button></p>`
      : `<div class="tour-state is-before" id="tour-enroll-state" data-enrolled="false">
          <p class="tour-state-title">${esc(t('tour.s3before', 'Sample state: not enrolled'))}</p>
          <p class="tour-state-detail">${esc(t('tour.s3beforeDetail', 'Try the switch to see what changes. It never creates a real enrollment.'))}</p>
        </div>
        <p><button type="button" class="tour-button" id="tour-enroll-toggle">${esc(t('tour.s3enrollBtn', 'Simulate enrolling'))}</button></p>`;

    return `${sampleBadge()}
      ${heading('tour-step-title', 'tour.s3title', 'Sample enrollment — what enrolling really unlocks')}
      <p class="tour-lede">${esc(t('tour.s3intro', 'Enrolling is how a learner starts a course. Watch the sample state change below.'))}</p>
      <p class="tour-course-why">${esc(t('tour.s3course', 'Sample course: {course}', { course: t(course.nameKey, course.name) }))}</p>
      ${stateBlock}
      <h3>${esc(t('tour.s3unlocksTitle', 'What real enrollment unlocks'))}</h3>
      <ul class="tour-list">${ENROLLMENT_UNLOCKS.map(([key, fallback]) => `<li>${esc(t(key, fallback))}</li>`).join('')}</ul>
      <p class="tour-footnote">${esc(t('tour.s3rule', 'Real enrollment needs an account, only works on courses marked available, and enrolling a second time returns your existing enrollment instead of creating another.'))}</p>
      <p class="tour-cta"><a class="tour-cta-link" href="courses.html">${esc(t('tour.openCourses', 'Browse real courses'))} <span aria-hidden="true">→</span></a></p>
      <p class="tour-account-note">${esc(t('tour.accountNote', 'CareerPath AI asks you to sign in, or create a free account, before you can browse or enroll.'))}</p>`;
  }

  /* ------------------------------ step 4 ------------------------------ */

  function renderStepLesson() {
    const progress = state.lessonSolved ? Math.round((1 / SAMPLE_LESSONS_TOTAL) * 100) : 0;
    const challenge = SAMPLE_LESSON_CHALLENGE;

    // A verdict is shown only for a choice the learner has actually marked, so a
    // new selection never inherits the previous answer's feedback. The
    // explanation is withheld on a wrong answer so the challenge stays open.
    let feedback = '';
    if (state.lessonSolved) {
      feedback = `<p class="tour-feedback" id="tour-lesson-feedback" data-state="correct" role="status">${esc(t('tour.s4correct', 'Correct.'))} ${esc(t(challenge.whyKey, challenge.why))}</p>`;
    } else if (state.lessonChecked) {
      feedback = `<p class="tour-feedback" id="tour-lesson-feedback" data-state="wrong" role="status">${esc(t('tour.s4try', 'Not quite — pick a different option, then check again.'))}</p>`;
    }

    const action = state.lessonSolved
      ? `<p class="tour-done">${esc(t('tour.s4done', 'Sample lesson complete. Nothing was saved to a real record.'))}</p>`
      : `<p><button type="button" class="tour-button" id="tour-lesson-check">${esc(t('tour.s4check', 'Check my answer'))}</button></p>`;

    return `${sampleBadge()}
      ${heading('tour-step-title', 'tour.s4title', 'Sample lesson — try a short challenge')}
      <p class="tour-lede">${esc(t('tour.s4intro', 'A real lesson tracks completion per lesson so progress and certificates stay honest.'))}</p>
      <article class="tour-lesson">
        <h3>${esc(t('tour.s4lessonTitle', 'How a model learns from examples'))}</h3>
        <p>${esc(t('tour.s4lessonBody', 'A model starts as numbers arranged in no useful way. Show it examples with their correct answers and it nudges those numbers whenever it guesses wrong. Repeat that often enough and the pattern appears on its own.'))}</p>
      </article>
      <div class="tour-challenge">
        <h4>${esc(t('tour.s4challengeTitle', 'Sample challenge'))}</h4>
        <p>${esc(t(challenge.promptKey, challenge.prompt))}</p>
        ${optionList(challenge.options.map(option => ({ label: t(option.labelKey, option.label) })), 'tour-lesson-q', state.lessonAnswer)}
        ${feedback}
        ${action}
      </div>
      <div class="tour-progress-block">
        <div class="tour-meter is-lg" role="progressbar" id="tour-lesson-progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="${esc(t('tour.s4progressLabel', 'Sample progress'))}"><span style="width:${progress}%"></span></div>
        <p class="tour-progress-text">${esc(t('tour.s4progressText', 'Sample progress: {current} of {total} lessons', { current: state.lessonSolved ? 1 : 0, total: SAMPLE_LESSONS_TOTAL }))}</p>
      </div>`;
  }

  /* ------------------------------ step 5 ------------------------------ */

  function gradeQuiz() {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    const rows = EXAM_ITEMS.map((item, index) => {
      const chosen = state.quiz[index];
      if (chosen === undefined) unanswered++;
      else if (chosen === item.answer) correct++;
      else incorrect++;
      return { item, index, chosen };
    });
    return { correct, incorrect, unanswered, rows, total: EXAM_ITEMS.length };
  }

  function renderStepQuiz() {
    const items = EXAM_ITEMS.map((item, index) => {
      const chosen = state.quiz[index];
      const answered = chosen !== undefined;
      let feedback = '';
      let marker = '';
      if (state.quizSubmitted) {
        if (!answered) {
          marker = t('tour.unanswered', 'Not answered.');
          feedback = `<p class="tour-feedback" id="tour-feedback-${index}" data-state="unanswered" role="status">${esc(marker)} ${esc(t(item.whyKey, item.why))}</p>`;
        } else if (chosen === item.answer) {
          feedback = `<p class="tour-feedback" id="tour-feedback-${index}" data-state="correct" role="status">${esc(t('tour.correct', 'Correct.'))} ${esc(t(item.whyKey, item.why))}</p>`;
        } else {
          feedback = `<p class="tour-feedback" id="tour-feedback-${index}" data-state="wrong" role="status">${esc(t('tour.incorrect', 'Not quite.'))} ${esc(t(item.whyKey, item.why))}</p>`;
        }
      } else if (answered) {
        marker = t('tour.s5answered', 'Answered — check your answers to see feedback.');
        feedback = `<p class="tour-feedback is-pending" id="tour-feedback-${index}" data-state="pending" role="status">${esc(marker)}</p>`;
      }
      return `<fieldset class="tour-block">
        <legend class="tour-block-title">
          <span class="tour-question-number">Q${index + 1}.</span>
          <span>${esc(t(item.textKey, item.text))}</span>
        </legend>
        ${optionList(item.options.map(option => ({ label: t(option.labelKey, option.label) })), `tour-exam-${index}`, chosen)}
        ${feedback}
      </fieldset>`;
    }).join('');

    const answeredCount = EXAM_ITEMS.filter((_item, index) => state.quiz[index] !== undefined).length;
    let done = '';
    if (state.quizSubmitted) {
      const grade = gradeQuiz();
      const percent = Math.round((grade.correct / grade.total) * 100);
      done = `<div class="tour-result" id="tour-exam-done">
        <h3>${esc(t('tour.examDone', 'Sample exam complete'))}</h3>
        <p class="tour-score-line" role="status">${esc(t('tour.examScore', 'You answered {correct} of {total} correctly (sample, not recorded).', { correct: grade.correct, total: grade.total }))}</p>
        <p class="tour-score-line">${esc(t('tour.s5breakdown', '{correct} correct · {incorrect} incorrect · {unanswered} unanswered', { correct: grade.correct, incorrect: grade.incorrect, unanswered: grade.unanswered }))}</p>
        ${meter(percent, t('tour.s5scoreLabel', 'Sample score'))}
        <p><button type="button" class="tour-button is-ghost" id="tour-quiz-retry">${esc(t('tour.s5retry', 'Try again'))}</button></p>
        <p class="tour-footnote">${esc(t('tour.s5retryHint', 'Pick a different answer at any time and this feedback updates immediately.'))}</p>
      </div>`;
    }

    const action = state.quizSubmitted
      ? ''
      : `<p><button type="button" class="tour-button" id="tour-check"${answeredCount < EXAM_ITEMS.length ? ' data-partial="true"' : ''}>${esc(t('tour.checkAnswers', 'Check answers'))}</button></p>`;

    return `${sampleBadge()}
      ${heading('tour-step-title', 'tour.s5title', 'Sample practice quiz — check your understanding')}
      <p class="tour-lede">${esc(t('tour.s5intro', 'Real exams are timed and graded on the server, and they are required for a certificate.'))}</p>
      <p class="tour-disclaimer">${esc(t('tour.s5local', 'This quiz runs entirely in your browser. It is not a real exam attempt and nothing is submitted or saved.'))}</p>
      ${items}
      ${action}
      ${done}`;
  }

  /* ------------------------------ step 6 ------------------------------ */

  function renderStepFinish() {
    const direction = directionById(state.direction);
    const courseId = recommendedCourses(state.direction)[0] || 'intro_to_ai';
    const course = COURSES[courseId] || COURSES.intro_to_ai;
    const grade = gradeQuiz();

    return `${sampleBadge()}
      ${heading('tour-step-title', 'tour.s6title', 'Your sample certificate preview')}
      <p class="tour-lede">${esc(t('tour.s6intro', 'A real certificate is only issued after the server verifies the whole course. This is a preview of what that looks like.'))}</p>
      <div class="tour-cert" id="tour-certificate">
        <div class="tour-cert-inner">
          <div class="tour-cert-watermark" aria-hidden="true">${esc(t('tour.watermark', 'SAMPLE — DEMO ONLY'))}</div>
          <div class="tour-cert-body">
            <p class="tour-cert-kicker">${esc(t('tour.watermark', 'SAMPLE — DEMO ONLY'))}</p>
            <h3 class="tour-cert-title">${esc(t('tour.s6certTitle', 'CareerPath AI Certificate'))}</h3>
            <p class="tour-cert-name">${esc(t('tour.s6certName', 'Sample Learner'))}</p>
            <p class="tour-cert-for">${esc(t('tour.s6certFor', 'Preview for: {course}', { course: t(course.nameKey, course.name) }))}</p>
            <p class="tour-cert-id">${esc(t('tour.s6certId', 'Certificate ID: none — nothing was issued or saved'))}</p>
          </div>
        </div>
      </div>
      <p class="tour-footnote">${esc(t('tour.s6noRecord', 'Completing this tour created no certificate, no enrollment, no lesson progress and no exam attempt.'))}</p>
      <h3>${esc(t('tour.eligTitle', 'How a real certificate is earned'))}</h3>
      <ul class="tour-eligibility">${ELIGIBILITY.map(([key, fallback]) => `<li>${esc(t(key, fallback))}</li>`).join('')}</ul>
      <p class="tour-footnote">${esc(t('tour.eligNote', 'Every rule above is checked by the server. This tour cannot satisfy any of them.'))}</p>
      <div class="tour-summary" id="tour-summary">
        <h3>${esc(t('tour.s6doneTitle', 'Tour complete'))}</h3>
        <ul class="tour-list">
          <li>${esc(t('tour.s6sum1', 'Sample direction: {direction}', { direction: direction ? t(direction.nameKey, direction.name) : t('tour.s6sumNone', 'not calculated') }))}</li>
          <li>${esc(t('tour.s6sum2', 'Sample enrollment: {state}', { state: state.enrolled ? t('tour.s6sumEnrolled', 'simulated') : t('tour.s6sumNot', 'not simulated') }))}</li>
          <li>${esc(t('tour.s6sum3', 'Sample lesson: {state}', { state: state.lessonSolved ? t('tour.s6sumDone', 'completed') : t('tour.s6sumNot', 'not attempted') }))}</li>
          <li>${esc(t('tour.s6sum4', 'Sample quiz: {correct} of {total} correct', { correct: grade.correct, total: grade.total }))}</li>
        </ul>
      </div>
      <h3>${esc(t('tour.s6nextTitle', 'Continue with the real platform'))}</h3>
      <div class="tour-next-actions">
        <a class="tour-button" href="career-test.html">${esc(t('tour.s6next1', 'Take the real career assessment'))}</a>
        <a class="tour-button is-ghost" href="courses.html">${esc(t('tour.openCourses', 'Browse real courses'))}</a>
        <button type="button" class="tour-button is-ghost" id="tour-restart-final">${esc(t('tour.restart', 'Restart tour'))}</button>
      </div>`;
  }

  const STEP_RENDERERS = [renderStepInterests, renderStepCourses, renderStepEnroll, renderStepLesson, renderStepQuiz, renderStepFinish];

  /* ------------------------------------------------------------------ *
   * Chrome: step rail, progress and controls.
   * ------------------------------------------------------------------ */

  function renderRail() {
    return `<ol class="tour-rail" id="tour-rail">${STEPS.map((step, index) => `
      <li class="tour-rail-item">
        <span class="tour-rail-dot" aria-hidden="true">${index + 1}</span>
        <span class="tour-rail-name">${esc(t(step.nameKey, step.name))}</span>
      </li>`).join('')}</ol>`;
  }

  function stepName(index) {
    return t(STEPS[index].nameKey, STEPS[index].name);
  }

  function updateChrome() {
    const current = state.step;
    const percent = Math.round(((current + 1) / TOTAL) * 100);
    const name = stepName(current);

    const label = document.getElementById('tour-step-label');
    if (label) label.textContent = t('tour.stepLabel', 'Step {current} of {total}', { current: current + 1, total: TOTAL });

    const bar = document.getElementById('tour-progress');
    if (bar) {
      bar.setAttribute('aria-valuenow', String(percent));
      bar.setAttribute('aria-valuetext', t('tour.progressText', 'Step {current} of {total}: {name}', { current: current + 1, total: TOTAL, name }));
    }
    const fill = document.getElementById('tour-progress-fill');
    if (fill) fill.style.width = `${percent}%`;

    const rail = document.getElementById('tour-rail');
    if (rail) {
      [...rail.children].forEach((item, index) => {
        item.classList.toggle('is-active', index === current);
        item.classList.toggle('is-done', index < current);
        if (index === current) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
    }

    const back = document.getElementById('tour-back');
    const next = document.getElementById('tour-next');
    if (back) {
      back.disabled = current === 0;
      back.setAttribute('title', current === 0 ? t('tour.navStart', 'This is the first step.') : '');
    }
    if (next) {
      next.disabled = current === TOTAL - 1;
      next.textContent = current === 0 ? t('tour.nextStart', 'Start the tour') : t('tour.next', 'Next');
      next.setAttribute('title', current === TOTAL - 1 ? t('tour.navEnd', 'This is the last step.') : '');
    }

    const hint = document.getElementById('tour-nav-hint');
    if (hint) {
      hint.textContent = current === 0
        ? t('tour.navStart', 'This is the first step.')
        : current === TOTAL - 1
          ? t('tour.navEnd', 'This is the last step.')
          : '';
    }
  }

  function render(options) {
    const stage = document.getElementById('tour-stage');
    if (!stage) return;
    // Rerendering replaces the stage markup but never the state object, so a
    // visitor's answers survive Back/Next, a restart of the same step, or a
    // language change.
    //
    // A keyboard visitor must not lose their place when answering a radio:
    // the re-render that publishes a new result has to hand focus back to the
    // control they were using.
    const active = document.activeElement;
    const restore = (options && options.focus) ? null
      : (active && stage.contains(active) && active instanceof HTMLInputElement
        ? { name: active.name, value: active.value }
        : null);

    stage.setAttribute('data-step', String(state.step + 1));
    stage.innerHTML = STEP_RENDERERS[state.step]();
    updateChrome();

    if (restore) {
      for (const input of stage.querySelectorAll('input')) {
        if (input.name === restore.name && input.value === restore.value) {
          input.focus({ preventScroll: true });
          break;
        }
      }
    }
    if (options && options.focus) {
      const title = stage.querySelector('.tour-step-title');
      if (title && typeof title.focus === 'function') title.focus({ preventScroll: true });
    }
  }

  function goToStep(next, options) {
    if (next < 0 || next >= TOTAL) return;
    state.step = next;
    render(options);
  }

  /* ------------------------------------------------------------------ *
   * Delegated interaction. Bound once; re-rendering cannot add duplicates.
   * ------------------------------------------------------------------ */

  function bindStage(stage) {
    stage.addEventListener('change', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
      const match = /^(tour-sample-q|tour-exam-|tour-lesson-q)(\d*)$/.exec(input.name || '');
      if (!match) return;
      const scope = match[1];
      const value = Number(input.value);

      if (scope === 'tour-lesson-q') {
        // Re-render so a changed selection never leaves stale feedback behind.
        state.lessonAnswer = value;
        state.lessonChecked = false;
        render();
        return;
      }
      const index = Number(match[2]);
      if (!Number.isInteger(index)) return;

      if (scope === 'tour-sample-q') {
        state.answers[index] = value;
        state.direction = resolveDirection();
        render();
        return;
      }
      // Practice quiz: keep the answers the visitor already gave, and regrade
      // immediately after a submission so feedback never goes stale.
      state.quiz[index] = value;
      if (state.quizSubmitted) render();
      else {
        const feedback = document.getElementById(`tour-feedback-${index}`);
        if (feedback) {
          feedback.dataset.state = 'pending';
          feedback.textContent = t('tour.s5answered', 'Answered — check your answers to see feedback.');
        }
        const button = document.getElementById('tour-check');
        if (button) button.removeAttribute('data-partial');
      }
    });

    stage.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('#tour-enroll-toggle')) {
        state.enrolled = !state.enrolled;
        render();
        return;
      }
      if (target.closest('#tour-lesson-check')) {
        const picked = stage.querySelector('input[name="tour-lesson-q"]:checked');
        const correct = picked && Number(picked.value) === SAMPLE_LESSON_CHALLENGE.answer;
        state.lessonChecked = true;
        state.lessonSolved = Boolean(correct);
        render();
        return;
      }
      if (target.closest('#tour-check')) {
        state.quizSubmitted = true;
        render();
        return;
      }
      if (target.closest('#tour-quiz-retry')) {
        // Retry keeps the current answers so a learner can adjust rather than
        // start over, and hides stale feedback until they check again.
        state.quizSubmitted = false;
        render();
        return;
      }
      if (target.closest('#tour-restart-final')) {
        resetState();
        render({ focus: true });
      }
    });
  }

  function bindChrome() {
    const stage = document.getElementById('tour-stage');
    if (stage) bindStage(stage);

    const back = document.getElementById('tour-back');
    if (back) back.addEventListener('click', () => goToStep(state.step - 1, { focus: true }));

    const next = document.getElementById('tour-next');
    if (next) next.addEventListener('click', () => goToStep(state.step + 1, { focus: true }));

    const restart = document.getElementById('tour-restart');
    if (restart) restart.addEventListener('click', () => { resetState(); render({ focus: true }); });

    const exit = document.getElementById('tour-exit');
    if (exit) exit.addEventListener('click', () => { window.location.href = 'index.html'; });

    // A language change re-renders the step in the new locale. State is kept,
    // so switching language never discards an answer mid-quiz.
    document.addEventListener('careerpath:language-change', () => render());
  }

  function initialize() {
    const railHost = document.getElementById('tour-rail-host');
    if (railHost) railHost.innerHTML = renderRail();
    bindChrome();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();