// Career Test Logic - CS Career Assessment Redesign
(function() {
  const API_BASE = window.API_BASE || '/api';
  const quizContainer = document.getElementById('quiz-container');
  const resultsContainer = document.getElementById('results-container');
  const questionTitle = document.getElementById('question-title');
  const questionCard = document.getElementById('question-card');
  const optionsContainer = document.getElementById('options-container');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const loadingSpinner = document.getElementById('loading-spinner');
  const resultsContent = document.getElementById('results-content');
  const retakeBtn = document.getElementById('retake-btn');

  // Current state
  let currentQuestion = 0;
  let answers = {}; // question_id -> value (1-5)
  let questions = []; // All fetched questions
  let selectedQuestionIds = []; // IDs of questions selected for this attempt
  let usedQuestionIds = []; // IDs of questions used in previous attempts (to avoid immediate repetition)
  let assessmentVersion = 'career-profile-v1';

  // In-progress attempt is kept in sessionStorage so a refresh mid-assessment
  // does not throw away the user's answers. This is client-side only: nothing
  // incomplete is ever written to the database.
  const ATTEMPT_STORAGE_KEY = 'cs-career-v2-attempt';
  const ATTEMPT_STATE_VERSION = 'cs-career-v2';

  // Display labels for the Likert scale, keyed by option_value. The stored
  // question bank uses "Neutral" for 3; the assessment shows the full wording.
  // This only affects what is rendered - the question bank is untouched.
  const ANSWER_LABELS = {
    1: 'Strongly Disagree',
    2: 'Disagree',
    3: 'Neither agree nor disagree',
    4: 'Agree',
    5: 'Strongly Agree'
  };

  function answerLabelFor(option) {
    const numeric = parseInt(option.value, 10);
    return ANSWER_LABELS[numeric] || option.text || String(option.value);
  }

  // Define the 8 dimensions
  const dimensions = [
    "Software Engineering",
    "Data & Analytical Thinking",
    "AI & Computational Intelligence",
    "Systems & Infrastructure",
    "Security & Reliability",
    "Product & User Orientation",
    "Design & Human Experience",
    "Leadership & Delivery"
  ];

  // Initialize quiz
  async function initQuiz({ skipSavedResult = false } = {}) {
    try {
      const token = await window.getAuthAccessToken();
      if (!token) {
        alert(t('coverage.assessmentLoginRequired', 'Please log in first to take the career test.'));
        window.location.href = 'login.html';
        return;
      }

      // Load used question IDs from localStorage (to avoid immediate repetition)
      const used = localStorage.getItem('cs-career-v2-used-questions');
      usedQuestionIds = used ? JSON.parse(used) : [];

      // Resume an unfinished attempt first; otherwise reopen the latest saved result.
      const hasInProgressAttempt = Boolean(sessionStorage.getItem(ATTEMPT_STORAGE_KEY));
      if (!skipSavedResult && !hasInProgressAttempt) {
        const savedResponse = await fetch(`${API_BASE}/career-test`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (savedResponse.ok) {
          const savedPayload = await savedResponse.json();
          if (savedPayload.result?.assessment_version === assessmentVersion && savedPayload.result.dimension_scores) {
            loadingSpinner.style.display = 'none';
            quizContainer.style.display = 'none';
            resultsContainer.style.display = 'block';
            displayResults(savedPayload.result);
            return;
          } else if (savedPayload.result) {
            console.info('The saved assessment predates career-profile-v1 and is not displayed as a v1 profile.');
          }
        } else if (savedResponse.status !== 404) {
          console.warn('Could not load the saved career profile:', await savedResponse.text());
        }
      }

      // Load questions from Supabase
      await loadQuestions();

      // Resume an unfinished attempt if one is stored, otherwise start fresh.
      if (restoreAttemptState()) {
        console.log('Resuming unfinished assessment attempt');
      } else {
        selectQuestionsForAttempt();
        currentQuestion = 0;
        answers = {};
        persistAttemptState();
      }

      // Update UI (this also refreshes navigation and progress)
      updateQuestionDisplay();
    } catch (error) {
      console.error('Failed to initialize quiz:', error);
      alert(t('coverage.assessmentLoadFailed', 'Failed to load career test. Please try again later.'));
      window.location.href = 'dashboard.html';
    }
  }

  // Load all questions from Supabase
  async function loadQuestions() {
    try {
      const token = await window.getAuthAccessToken();
      if (!token) throw new Error('Your session has expired. Please log in again.');

      const response = await fetch(`${API_BASE}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();

      // Normalize question data.
      // /api/questions returns already-formatted { id, text, category, options }.
      // Accept the raw database shape (question_text / question_options) as well.
      questions = (Array.isArray(data) ? data : data.questions || []).map(q => ({
        id: q.id,
        text: q.question_text || q.text,
        category: q.category,
        options: (q.options || q.question_options || []).map(opt => ({
          value: opt.value === undefined ? opt.option_value : opt.value,
          text: opt.text === undefined ? opt.option_text : opt.text
        }))
      }));

      if (questions.length === 0) {
        throw new Error('No questions found');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      throw error;
    }
  }

  // Select 25 questions for the attempt: 3 per dimension + 1 cross-dimensional
  function selectQuestionsForAttempt() {
    // Group questions by dimension
    const questionsByDimension = {};
    dimensions.forEach(dim => {
      questionsByDimension[dim] = questions.filter(q => q.category === dim);
    });

    // For each dimension, select 3 questions that haven't been used recently
    selectedQuestionIds = [];
    dimensions.forEach(dim => {
      const dimQuestions = questionsByDimension[dim];
      // Filter out recently used questions
      const available = dimQuestions.filter(q => !usedQuestionIds.includes(q.id));
      // If we don't have enough available, fall back to all questions in the dimension
      const pool = available.length >= 3 ? available : dimQuestions;
      // Randomly select 3
      const selected = [];

      if (pool.length >= 3) {
        // Shuffle and take first 3
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        selected.push(...shuffled.slice(0, 3));
      } else {
        // If less than 3 available, take all and then fill with random from the dimension
        selected.push(...pool);
        const remainingNeeded = 3 - pool.length;
        if (remainingNeeded > 0) {
          const remainingPool = dimQuestions.filter(q => !selected.includes(q));
          if (remainingPool.length > 0) {
            const shuffled = [...remainingPool].sort(() => 0.5 - Math.random());
            selected.push(...shuffled.slice(0, remainingNeeded));
          }
        }
      }

      selectedQuestionIds.push(...selected.map(q => q.id));
    });

    // Add 1 cross-dimensional question (random from any dimension)
    const allQuestions = questions.filter(q => !selectedQuestionIds.includes(q.id));
    if (allQuestions.length > 0) {
      const cross = allQuestions[Math.floor(Math.random() * allQuestions.length)];
      selectedQuestionIds.push(cross.id);
    }

    // Ensure we have exactly 25 questions
    if (selectedQuestionIds.length !== 25) {
      console.warn(`Expected 25 questions, got ${selectedQuestionIds.length}. Adjusting...`);
      // If we have more than 25, trim
      if (selectedQuestionIds.length > 25) {
        selectedQuestionIds = selectedQuestionIds.slice(0, 25);
      } else if (selectedQuestionIds.length < 25) {
        // Add more questions from the pool
        const needed = 25 - selectedQuestionIds.length;
        const remaining = questions.filter(q => !selectedQuestionIds.includes(q.id));
        if (remaining.length >= needed) {
          const shuffled = [...remaining].sort(() => 0.5 - Math.random());
          selectedQuestionIds.push(...shuffled.slice(0, needed).map(q => q.id));
        }
      }
    }

    // Filter questions to only those selected for this attempt
    questions = questions.filter(q => selectedQuestionIds.includes(q.id));

    // Shuffle the order for display
    questions.sort(() => 0.5 - Math.random());
  }

  // Update question display
  function updateQuestionDisplay() {
    if (currentQuestion >= questions.length) {
      return;
    }
    const question = questions[currentQuestion];
    questionTitle.textContent = question.text;

    // Clear options
    optionsContainer.innerHTML = '';

    // The saved answer for THIS question, if any. answers is keyed by question
    // id, so returning to a question must re-mark its choice - previously the
    // radios were rebuilt unchecked, which made answered questions look blank.
    const savedValue = answers[question.id];

    // Create options
    question.options.forEach(option => {
      const optionValue = parseInt(option.value, 10);
      const isSelected = savedValue !== undefined && savedValue === optionValue;

      const label = document.createElement('label');
      label.className = 'answer-choice' + (isSelected ? ' is-selected' : '');
      label.setAttribute('for', `answer-${question.id}-${option.value}`);

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `answer-${question.id}`;
      input.id = `answer-${question.id}-${option.value}`;
      input.value = option.value;
      input.checked = isSelected;

      const marker = document.createElement('span');
      marker.className = 'answer-choice__marker';
      marker.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'answer-choice__text';
      text.textContent = answerLabelFor(option);

      label.appendChild(input);
      label.appendChild(marker);
      label.appendChild(text);

      // Add event listener after the element is inserted into DOM
      input.addEventListener('change', () => {
        saveAnswer(question.id, option.value);
      });

      optionsContainer.appendChild(label);
    });

    // Update question counter
    document.getElementById('question-counter').textContent = `${currentQuestion + 1} / ${questions.length}`;

    // Button state depends on whether THIS question is answered, so it has to be
    // recomputed on every render - not only when an answer changes.
    updateNavigation();
    updateProgress();
    scrollToQuestion();
  }

  // Keep the question card at the top of the viewport so the five choices and
  // the Previous/Next row stay reachable without manual scrolling.
  function scrollToQuestion() {
    if (!questionCard) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    questionCard.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  // Save answer
  function saveAnswer(questionId, value) {
    answers[questionId] = parseInt(value, 10);

    // Reflect the selection on the rendered choices
    optionsContainer.querySelectorAll('.answer-choice').forEach(choice => {
      const input = choice.querySelector('input[type="radio"]');
      choice.classList.toggle('is-selected', Boolean(input && input.checked));
    });

    updateNavigation();
    persistAttemptState();
  }

  // Update navigation buttons
  function updateNavigation() {
    const question = questions[currentQuestion];
    const answered = answers[question.id] !== undefined;

    // Previous button
    prevBtn.disabled = currentQuestion === 0;

    // Next/Submit button
    if (currentQuestion === questions.length - 1) {
      // Last question
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-block';
      submitBtn.disabled = !answered;
    } else {
      // Not last question
      nextBtn.style.display = 'inline-block';
      submitBtn.style.display = 'none';
      nextBtn.disabled = !answered;
    }
  }

  // Update progress bar
  function updateProgress() {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = t('assessment.questionProgress', 'Question {current} of {total}', { current: currentQuestion + 1, total: questions.length });
  }

  // Navigate to next question. Existing answers are never cleared - moving
  // between questions only changes which question is rendered.
  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      persistAttemptState();
      updateQuestionDisplay();
    }
  }

  // Navigate to previous question
  function previousQuestion() {
    if (currentQuestion > 0) {
      currentQuestion--;
      persistAttemptState();
      updateQuestionDisplay();
    }
  }

  // ---- In-progress attempt persistence (sessionStorage) --------------------
  // Only the temporary client-side state is stored: the selected question
  // order, the current index, and the answers keyed by question id. Nothing is
  // written to the database until the user submits.

  function persistAttemptState() {
    if (!questions.length) return;
    try {
      sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify({
        version: ATTEMPT_STATE_VERSION,
        // DISPLAY order. currentIndex is an index into this list, and
        // selectQuestionsForAttempt() shuffles the questions before showing
        // them, so this is deliberately not the selection order.
        questionIds: questions.map(q => q.id),
        // Kept separately so the submitted question_ids keep their original order.
        selectedQuestionIds: selectedQuestionIds,
        currentIndex: currentQuestion,
        answers: answers
      }));
    } catch (e) {
      console.warn('Could not persist assessment state:', e);
    }
  }

  function clearAttemptState() {
    try {
      sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not clear assessment state:', e);
    }
  }

  // Restore an unfinished attempt. Returns false when there is nothing usable
  // stored, in which case the caller starts a fresh attempt.
  function restoreAttemptState() {
    let stored = null;
    try {
      const raw = sessionStorage.getItem(ATTEMPT_STORAGE_KEY);
      if (!raw) return false;
      stored = JSON.parse(raw);
    } catch (e) {
      return false;
    }

    if (!stored || stored.version !== ATTEMPT_STATE_VERSION) return false;
    if (!Array.isArray(stored.questionIds) || stored.questionIds.length === 0) return false;

    // Every stored id must still be present in the pool we just fetched.
    const restoredQuestions = stored.questionIds
      .map(id => questions.find(q => q.id === id))
      .filter(Boolean);
    if (restoredQuestions.length !== stored.questionIds.length) return false;

    // Rebuild the questions in the SAME display order they were stored in, so
    // the restored index points at the question the user was actually on.
    questions = restoredQuestions;

    const selectionOrder = Array.isArray(stored.selectedQuestionIds) &&
      stored.selectedQuestionIds.length === stored.questionIds.length
      ? stored.selectedQuestionIds
      : stored.questionIds;
    selectedQuestionIds = selectionOrder.slice();

    answers = (stored.answers && typeof stored.answers === 'object') ? stored.answers : {};

    const index = Number(stored.currentIndex);
    currentQuestion = Number.isInteger(index) && index >= 0 && index < questions.length ? index : 0;
    return true;
  }

  // Submit test
  async function submitTest() {
    // Check if all questions answered
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert(t('coverage.assessmentAnswerAll', 'Please answer all questions before submitting.'));
      return;
    }

    // Show loading
    quizContainer.style.display = 'none';
    loadingSpinner.style.display = 'block';

    try {
      const token = await window.getAuthAccessToken();
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const submissionData = {
        assessment_version: assessmentVersion,
        question_ids: selectedQuestionIds,
        answers: answers,
        completed: true
      };

      // Submit to backend
      const response = await fetch(`${API_BASE}/career-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save career test');
      }

      // The attempt is now saved server-side, so the temporary in-progress
      // state is no longer needed.
      clearAttemptState();

      // Update used question IDs for next time (avoid immediate repetition)
      usedQuestionIds.push(...selectedQuestionIds);
      // Keep only the last 100 used questions to prevent localStorage from growing too large
      if (usedQuestionIds.length > 100) {
        usedQuestionIds = usedQuestionIds.slice(-100);
      }
      localStorage.setItem('cs-career-v2-used-questions', JSON.stringify(usedQuestionIds));

      // Hide loading, show results
      loadingSpinner.style.display = 'none';
      resultsContainer.style.display = 'block';
      displayResults(result.result);

    } catch (error) {
      console.error('Career test error:', error);
      loadingSpinner.style.display = 'none';
      quizContainer.style.display = 'block';
      alert(t('coverage.assessmentError', 'Something went wrong while processing your assessment. Please try again.'));
    }
  }

  const careerDirections = {
    'Software Developer': ['Software & Engineering', ['Software Developer', 'Full Stack Developer', 'Backend Developer']],
    'Full Stack Developer': ['Software & Engineering', ['Software Developer', 'Full Stack Developer', 'Backend Developer']],
    'Backend Developer': ['Software & Engineering', ['Software Developer', 'Full Stack Developer', 'Backend Developer']],
    'Data Scientist': ['Data & Analytics', ['Data Scientist', 'Data Analyst']],
    'Data Analyst': ['Data & Analytics', ['Data Scientist', 'Data Analyst']],
    'AI/ML Engineer': ['AI & Intelligent Systems', ['AI/ML Engineer']],
    'Cloud Architect': ['Cloud & Infrastructure', ['Cloud Architect', 'DevOps Engineer']],
    'DevOps Engineer': ['Cloud & Infrastructure', ['Cloud Architect', 'DevOps Engineer']],
    'Frontend Developer': ['Design & Experience', ['Frontend Developer', 'UI/UX Designer']],
    'UI/UX Designer': ['Design & Experience', ['Frontend Developer', 'UI/UX Designer']],
    'Product Manager': ['Product & Delivery', ['Product Manager']]
  };
  const learningPathOrder = {
    'Software Developer': ['python_for_careers', 'web_dev', 'dsa', 'full_stack', 'vibe_coding', 'ai_software_engineering', 'ai_builder_capstone']
  };

  const dimensionLocaleKeys = {
    'Software Engineering': 'careerDimensionSoftware',
    'Data & Analytical Thinking': 'careerDimensionData',
    'AI & Computational Intelligence': 'careerDimensionAI',
    'Systems & Infrastructure': 'careerDimensionSystems',
    'Security & Reliability': 'careerDimensionSecurityReliability',
    'Product & User Orientation': 'careerDimensionProduct',
    'Design & Human Experience': 'careerDimensionDesign',
    'Leadership & Delivery': 'careerDimensionLeadership'
  };
  const localizedDimension = dimension => t(`coverage.${dimensionLocaleKeys[dimension]}`, dimension);

  function displayResults(result) {
    const topCareers = result?.top_careers || result?.topCareers || [];
    const strengths = result?.strengths || [];
    const dimensionScores = result?.dimension_scores || result?.dimensionScores || {};
    resultsContent.replaceChildren();
    if (!topCareers.length) {
      const p = document.createElement('p');
      p.textContent = t('coverage.noCareerProfileResult', 'No career profile is available. Please retake the assessment.');
      resultsContent.appendChild(p);
      return;
    }

    const [direction, related] = careerDirections[topCareers[0].career] || ['Technology & Digital Careers', topCareers.map(c => c.career)];
    const hero = document.createElement('section');
    hero.className = 'career-result-hero';
    const title = document.createElement('h2');
    title.textContent = t('careerResult.direction.' + direction, direction);
    const summary = document.createElement('p');
    summary.textContent = t('careerResult.directionSummary', 'Your strongest career alignment is with {career}, with related paths to explore.', {career: topCareers[0].career});
    hero.append(title, summary);
    resultsContent.appendChild(hero);

    const observed = document.createElement('section');
    observed.className = 'career-result-section';
    const observedTitle = document.createElement('h2');
    observedTitle.textContent = t('careerResult.observed', 'What we observed');
    observed.appendChild(observedTitle);
    const strongest = Object.entries(dimensionScores).filter(([, value]) => Number.isFinite(Number(value))).sort((a,b) => Number(b[1])-Number(a[1])).slice(0,3);
    const observations = document.createElement('ul');
    strongest.forEach(([name], index) => {
      const li = document.createElement('li');
      li.textContent = t(index === 0 ? 'careerResult.signalStrongest' : 'careerResult.signalAlso', index === 0 ? 'Your strongest signal is {dimension}.' : '{dimension} is also a signal in your profile.', {dimension: localizedDimension(name)});
      observations.appendChild(li);
    });
    observed.appendChild(observations);
    const signals = document.createElement('details');
    signals.className = 'career-result-details';
    const signalsSummary = document.createElement('summary');
    signalsSummary.textContent = t('careerResult.profileSignals', 'Your profile signals');
    signals.appendChild(signalsSummary);
    const bars = document.createElement('div');
    bars.className = 'career-dimension-list';
    dimensions.forEach(dimension => {
      if (!Number.isFinite(Number(dimensionScores[dimension]))) return;
      const row = document.createElement('div'); row.className = 'dimension-insight';
      const label = document.createElement('span'); label.className = 'dimension-label'; label.textContent = localizedDimension(dimension);
      const track = document.createElement('div'); track.className = 'dimension-bar';
      const fill = document.createElement('div'); fill.className = 'dimension-fill'; fill.style.width = `${Math.round(Number(dimensionScores[dimension])*100)}%`;
      track.appendChild(fill);
      const value = document.createElement('span'); value.className = 'dimension-percentage'; value.textContent = `${Math.round(Number(dimensionScores[dimension])*100)}%`;
      row.append(label, track, value); bars.appendChild(row);
    });
    signals.appendChild(bars); observed.appendChild(signals); resultsContent.appendChild(observed);

    const relatedSection = document.createElement('section'); relatedSection.className = 'career-result-section';
    const relatedTitle = document.createElement('h2'); relatedTitle.textContent = t('careerResult.relatedPaths', 'Related paths'); relatedSection.appendChild(relatedTitle);
    const relatedList = document.createElement('ul'); relatedList.className = 'career-related-list';
    related.filter(career => career !== topCareers[0].career).forEach(career => {
      const found = topCareers.find(item => item.career === career);
      const li = document.createElement('li'); li.textContent = found ? `${career} ? ${found.score}%` : career; relatedList.appendChild(li);
    });
    if (!relatedList.children.length) topCareers.slice(1).forEach(item => { const li=document.createElement('li'); li.textContent=`${item.career} ? ${item.score}%`; relatedList.appendChild(li); });
    if (relatedList.children.length) { relatedSection.appendChild(relatedList); resultsContent.appendChild(relatedSection); }

    const transparency = document.createElement('section'); transparency.className = 'career-result-section career-transparency';
    const calc = document.createElement('details'); calc.className = 'career-result-details';
    const calcSummary = document.createElement('summary'); calcSummary.textContent = t('careerResult.calculationTitle', 'How this result is calculated'); calc.appendChild(calcSummary);
    const calcText = document.createElement('p'); calcText.textContent = t('careerResult.calculationBody', 'Each answer is 1?5 and is normalized with (answer ? 1) / 4. Normalized answers are averaged within each of the 8 dimensions. The resulting 8-dimensional learner vector is compared with 11 fixed career reference vectors using mean absolute difference (L1 distance). Similarity is 1 minus mean absolute difference; fit percentage is similarity ? 100. This deterministic mathematical similarity algorithm identifies the highest-aligned career profiles.');
    calc.appendChild(calcText); transparency.appendChild(calc);
    const full = document.createElement('details'); full.className = 'career-result-details';
    const fullSummary = document.createElement('summary'); fullSummary.textContent = t('careerResult.fullResults', 'Your full results'); full.appendChild(fullSummary);
    const allResults = document.createElement('ul');
    topCareers.forEach(item => { const li=document.createElement('li'); li.textContent=`${item.career}: ${item.score}%`; allResults.appendChild(li); });
    strengths.forEach(item => { const li=document.createElement('li'); li.textContent=item; allResults.appendChild(li); });
    full.appendChild(allResults); transparency.appendChild(full); resultsContent.appendChild(transparency);

    renderCareerCourseRecommendations(topCareers);
  }

  async function renderCareerCourseRecommendations(topCareers) {
    try {
      const token = await window.getAuthAccessToken();
      if (!token) throw new Error('Please sign in to load the learning path.');
      const response = await fetch(`${API_BASE}/courses`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Course catalog request failed: ${response.status}`);
      const catalog = await response.json();
      const coursesById = new Map((catalog.courses || []).map(course => [course.id, course]));
      const mappings = catalog.career_course_mapping || {};
      const recommendedIds = new Set(topCareers.flatMap(item => mappings[item.career] || []));
      const primaryCareer = topCareers[0].career;
      const ordered = catalog.learning_path_order?.[primaryCareer] || learningPathOrder[primaryCareer] || [];
      const orderedIds = [...ordered, ...topCareers.flatMap(item => mappings[item.career] || [])].filter((id, i, arr) => arr.indexOf(id) === i && recommendedIds.has(id));
      const available = orderedIds.map(id => coursesById.get(id)).filter(course => course && (course.status || 'available') === 'available');
      const coming = orderedIds.map(id => coursesById.get(id)).filter(course => course && course.status === 'coming_soon');
      const section = document.createElement('section'); section.className = 'career-result-section career-learning-path';
      const heading = document.createElement('h2'); heading.textContent = t('careerResult.learningPath', 'Your learning path'); section.appendChild(heading);
      const stages = ['startHere','next','then','continue'];
      available.forEach((course, index) => {
        const card = document.createElement('article'); card.className = `career-course-step${index === 0 ? ' is-first' : ''}`;
        const stage = document.createElement('p'); stage.className='career-course-stage'; stage.textContent=t(`careerResult.stage.${stages[index] || 'continue'}`, ['Start here','Next','Then','Continue'][index] || 'Continue');
        const name=document.createElement('h3'); name.textContent=t(`courseMetadata.${course.id}.title`,course.title);
        const link=document.createElement('a'); link.className=index===0?'btn-primary':'btn-outline'; link.href=`course-detail.html?id=${encodeURIComponent(course.id)}`;
        link.textContent=index===0?t('careerResult.startLearning','Start learning: {course}',{course:name.textContent}):t('careerResult.viewCourse','View course');
        card.append(stage,name,link); section.appendChild(card);
      });
      if (available.length) resultsContent.appendChild(section);
      if (coming.length) {
        const later=document.createElement('section'); later.className='career-result-section career-coming-later';
        const laterTitle=document.createElement('h2'); laterTitle.textContent=t('careerResult.comingLater','Coming later'); later.appendChild(laterTitle);
        const list=document.createElement('ul'); coming.forEach(course=>{const li=document.createElement('li');li.textContent=t(`courseMetadata.${course.id}.title`,course.title);list.appendChild(li);}); later.appendChild(list); resultsContent.appendChild(later);
      }
    } catch (error) { console.warn('Could not load courses related to this career profile:', error); }
  }

  // Retake test
  retakeBtn.addEventListener('click', () => {
    // Discard any stored attempt so the retake starts from a clean slate
    clearAttemptState();
    resultsContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'auto' });
    // Re-initialize quiz
    initQuiz({ skipSavedResult: true });
  });

  // Event listeners
  prevBtn.addEventListener('click', previousQuestion);
  nextBtn.addEventListener('click', nextQuestion);
  submitBtn.addEventListener('click', submitTest);

  // Initialize quiz; initQuiz validates the current Supabase access token.
  initQuiz();

})();
