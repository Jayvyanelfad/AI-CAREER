// Guided sample tour of the CareerPath AI learner journey.
//
// Demonstration only: every step renders isolated local sample data. This
// script performs no network requests and never creates or modifies real
// enrollments, progress, exam attempts, or certificates.
(function () {
  'use strict';
  const t = (key, fallback, vars) => window.t ? window.t(key, fallback, vars) : (fallback || key);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

  const TOTAL = 6;
  let index = 0;

  const SAMPLE_QUESTIONS = [
    {
      prompt: 'Sample: what does HTML mainly describe?',
      options: ['The structure of a web page', 'The colors of a logo', 'The speed of a network'],
      answer: 0,
      why: 'Sample explanation: HTML markup defines document structure; styling belongs to CSS.'
    },
    {
      prompt: 'Sample: which habit keeps passwords safer?',
      options: ['Reusing one password everywhere', 'Unique passwords kept in a password manager', 'Sharing passwords by email'],
      answer: 1,
      why: 'Sample explanation: unique passwords limit breach impact; managers make them practical.'
    },
    {
      prompt: 'Sample: what is 2 + 2 × 2?',
      options: ['8', '4', '6'],
      answer: 2,
      why: 'Sample explanation: multiplication binds tighter than addition, so 2 + (2 × 2) = 6.'
    }
  ];

  const SAMPLE_COURSES = [
    { id: 'intro_to_ai', name: 'Introduction to AI & ML' },
    { id: 'python_for_careers', name: 'Python for Career Development' },
    { id: 'web_dev', name: 'Web Development Fundamentals' }
  ];

  function sampleBadge() {
    return `<span class="tour-sample-badge">${esc(t('tour.sampleBadge', 'Sample demonstration only'))}</span>`;
  }

  function renderAssessment() {
    return `${sampleBadge()}
      <h2>${esc(t('tour.s1title', '1 · Try a sample assessment question'))}</h2>
      <p>${esc(t('tour.s1intro', 'Real assessments adapt to your answers. This one fixed question shows the shape of the flow.'))}</p>
      <div class="tour-sample-options" role="radiogroup" aria-label="Sample question">
        ${['Build things step by step', 'Understand how systems behave', 'Help people use technology'].map((text, i) => `
          <label><input type="radio" name="tour-sample-q" value="${i}"${i === 0 ? ' checked' : ''} /> <span>${esc(text)}</span></label>`).join('')}
      </div>
      <div class="dashboard-card">
        <h3>${esc(t('tour.s1resultTitle', 'Sample result: Data Analyst direction'))}</h3>
        <p class="text-body_small color-green_light">${esc(t('tour.s1resultNote', 'Illustrative only — real results come from your full assessment.'))}</p>
        <p><a class="text-link" href="career-test.html">${esc(t('tour.openTest', 'Open the real career test'))} →</a></p>
      </div>`;
  }

  function renderCourses() {
    return `${sampleBadge()}
      <h2>${esc(t('tour.s2title', '2 · See sample course recommendations'))}</h2>
      <p>${esc(t('tour.s2intro', 'The real catalog recommends courses from your results. These sample cards link to real course pages.'))}</p>
      ${SAMPLE_COURSES.map(course => `
        <div class="dashboard-card"><h3>${esc(course.name)}</h3>
        <p><a class="text-link" href="course-detail.html?id=${encodeURIComponent(course.id)}">${esc(t('tour.openCourse', 'Open course page'))} →</a></p></div>`).join('')}`;
  }

  function renderEnroll() {
    return `${sampleBadge()}
      <h2>${esc(t('tour.s3title', '3 · How enrollment works'))}</h2>
      <p>${esc(t('tour.s3intro', 'Enrolling is free and unlocks lessons, progress tracking, exams, and certificates. Nothing is enrolled by this tour.'))}</p>
      <p><strong>${esc(t('tour.s3state', 'Sample state: enrolled in Introduction to AI & ML'))}</strong></p>
      <p><a class="text-link" href="courses.html">${esc(t('tour.openCourses', 'Browse real courses'))} →</a></p>`;
  }

  function renderLesson() {
    return `${sampleBadge()}
      <h2>${esc(t('tour.s4title', '4 · Preview a sample lesson'))}</h2>
      <p>${esc(t('tour.s4intro', 'Real lessons track your progress per lesson. This sample shows one lesson excerpt and a sample progress bar.'))}</p>
      <div class="dashboard-card"><h3>Sample lesson: What is a model?</h3>
      <p>A model is a program learned from examples: it takes new inputs and produces predictions. Real lessons add stories, examples, and challenges.</p></div>
      <div class="tour-samplebar" role="progressbar" aria-valuenow="33" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(t('tour.s4progressLabel', 'Sample progress'))}"><span style="width: 33%"></span></div>
      <p class="text-body_small">1 / 3 ${esc(t('tour.s4progressText', 'sample lessons complete'))}</p>`;
  }

  function renderExam() {
    const items = SAMPLE_QUESTIONS.map((item, qi) => `
      <fieldset class="dashboard-card">
        <legend><strong>Q${qi + 1}.</strong> ${esc(item.prompt)}</legend>
        <div class="tour-sample-options">
          ${item.options.map((text, oi) => `
            <label><input type="radio" name="tour-exam-${qi}" value="${oi}" /> <span>${esc(text)}</span></label>`).join('')}
        </div>
        <p class="tour-feedback" id="tour-feedback-${qi}" role="status"></p>
      </fieldset>`).join('');
    return `${sampleBadge()}
      <h2>${esc(t('tour.s5title', '5 · Try a sample practice exam'))}</h2>
      <p>${esc(t('tour.s5intro', 'Real exams are timed, graded server-side, and required for certificates. These sample questions are checked locally in your browser.'))}</p>
      ${items}
      <p><button type="button" class="component-button" id="tour-check">${esc(t('tour.checkAnswers', 'Check answers'))}</button></p>
      <div id="tour-exam-done"></div>`;
  }

  function renderCertificate() {
    return `${sampleBadge()}
      <h2>${esc(t('tour.s6title', '6 · Preview a sample certificate'))}</h2>
      <p>${esc(t('tour.s6intro', 'Real certificates are issued only after verified course completion. This preview is clearly marked.'))}</p>
      <div class="dashboard-card tour-cert">
        <div class="tour-cert-watermark" aria-hidden="true">${esc(t('tour.watermark', 'SAMPLE — DEMO ONLY'))}</div>
        <h3>CareerPath AI Certificate (sample)</h3>
        <p><strong>Introduction to AI & ML</strong></p>
        <p class="text-body_small">Sample Learner · ${esc(t('tour.sampleDate', 'Sample date'))}</p>
      </div>
      <h3>${esc(t('tour.eligTitle', 'How real certificates are earned'))}</h3>
      <ul class="tour-eligibility">
        <li>${esc(t('tour.eligEnrolled', 'Enroll in the course'))}</li>
        <li>${esc(t('tour.eligLessons', 'Complete every required lesson'))}</li>
        <li>${esc(t('tour.eligExam', 'Pass the final exam for that course'))}</li>
      </ul>
      <p class="text-body_small">${esc(t('tour.eligNote', 'Certificates can only be issued by the server after it verifies all three steps. This tour never creates one.'))}</p>
      <p><a class="text-link" href="certificate.html">${esc(t('tour.openVerify', 'Open certificate verification'))} →</a></p>`;
  }

  const STEPS = [renderAssessment, renderCourses, renderEnroll, renderLesson, renderExam, renderCertificate];

  function render() {
    const stage = document.getElementById('tour-stage');
    stage.innerHTML = STEPS[index]();
    const label = document.getElementById('tour-step-label');
    label.textContent = t('tour.stepLabel', `Step ${index + 1} of ${TOTAL}`, { current: index + 1, total: TOTAL });
    const bar = document.getElementById('tour-progress');
    const fill = document.getElementById('tour-progress-fill');
    const percent = Math.round(((index + 1) / TOTAL) * 100);
    bar.setAttribute('aria-valuenow', String(percent));
    fill.style.width = `${percent}%`;
    document.getElementById('tour-back').disabled = index === 0;
    document.getElementById('tour-next').disabled = index === TOTAL - 1;
    const check = document.getElementById('tour-check');
    if (check) check.addEventListener('click', checkExam);
  }

  function checkExam() {
    let correct = 0;
    SAMPLE_QUESTIONS.forEach((item, qi) => {
      const picked = document.querySelector(`input[name="tour-exam-${qi}"]:checked`);
      const feedback = document.getElementById(`tour-feedback-${qi}`);
      if (!feedback) return;
      if (picked && Number(picked.value) === item.answer) {
        correct++;
        feedback.dataset.state = 'correct';
        feedback.textContent = `${t('tour.correct', 'Correct.') } ${item.why}`;
      } else {
        feedback.dataset.state = 'wrong';
        feedback.textContent = `${t('tour.incorrect', 'Not quite.')} ${item.why}`;
      }
    });
    const done = document.getElementById('tour-exam-done');
    if (done) {
      done.innerHTML = `<div class="dashboard-card"><h3>${esc(t('tour.examDone', 'Sample exam complete'))}</h3>
        <p role="status">${esc(t('tour.examScore', `You answered ${correct} of ${SAMPLE_QUESTIONS.length} correctly (sample, not recorded).`, { correct, total: SAMPLE_QUESTIONS.length }))}</p></div>`;
    }
  }

  function exit() { window.location.href = 'index.html'; }

  document.getElementById('tour-next').addEventListener('click', () => {
    if (index < TOTAL - 1) { index++; render(); }
  });
  document.getElementById('tour-back').addEventListener('click', () => {
    if (index > 0) { index--; render(); }
  });
  document.getElementById('tour-restart').addEventListener('click', () => {
    index = 0; render();
  });
  document.getElementById('tour-exit').addEventListener('click', exit);
  document.addEventListener('careerpath:language-change', render);

  render();
})();
