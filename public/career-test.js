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
  const strengthsSection = document.getElementById('strengths-section');
  const strengthsList = document.getElementById('strengths-list');
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
        alert('Please log in first to take the career test.');
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
      alert('Failed to load career test. Please try again later.');
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
    questionCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
    progressText.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
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
      alert('Please answer all questions before submitting.');
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
      alert('Error: ' + error.message);
    }
  }

  // Display results
  function displayResults(result) {
    const topCareers = result?.top_careers || result?.topCareers || [];
    const strengths = result?.strengths || [];
    const dimensionScores = result?.dimension_scores || result?.dimensionScores || {};
    resultsContent.innerHTML = '';

    if (!topCareers || topCareers.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No career profile is available. Please retake the assessment.';
      resultsContent.appendChild(emptyMessage);
      return;
    }

    const dimensionHeading = document.createElement('h2');
    dimensionHeading.className = 'text-h3';
    dimensionHeading.textContent = '8-Dimension Profile';
    resultsContent.appendChild(dimensionHeading);

    dimensions.forEach(dimension => {
      const score = Number(dimensionScores[dimension]);
      if (!Number.isFinite(score)) return;
      const percentage = Math.round(score * 100);
      const row = document.createElement('div');
      row.className = 'dimension-insight';
      row.style.margin = 'var(--space-3) 0';

      const label = document.createElement('div');
      label.className = 'dimension-label';
      label.textContent = dimension;
      const track = document.createElement('div');
      track.className = 'dimension-bar';
      track.style.height = '0.6rem';
      track.style.background = 'var(--border)';
      track.style.borderRadius = '999px';
      track.style.overflow = 'hidden';
      const fill = document.createElement('div');
      fill.className = 'dimension-fill';
      fill.style.width = `${percentage}%`;
      fill.style.height = '100%';
      fill.style.background = 'var(--accent, var(--bege))';
      track.appendChild(fill);
      const value = document.createElement('div');
      value.className = 'dimension-percentage';
      value.textContent = `${percentage}%`;

      row.append(label, track, value);
      resultsContent.appendChild(row);
    });

    const careersHeading = document.createElement('h2');
    careersHeading.className = 'text-h3';
    careersHeading.style.marginTop = 'var(--space-6)';
    careersHeading.textContent = 'Top Career Directions';
    resultsContent.appendChild(careersHeading);

    topCareers.forEach((careerObj, index) => {
      const careerCard = document.createElement('div');
      careerCard.className = 'career-card';
      const rank = document.createElement('div');
      rank.className = 'career-rank';
      rank.textContent = `#${index + 1}`;
      const info = document.createElement('div');
      info.className = 'career-info';
      const title = document.createElement('h3');
      title.textContent = careerObj.career;
      const alignment = document.createElement('div');
      alignment.className = 'score';
      alignment.append('Career Alignment: ');
      const score = document.createElement('strong');
      score.textContent = `${careerObj.score}%`;
      alignment.appendChild(score);
      info.append(title, alignment);
      careerCard.append(rank, info);
      resultsContent.appendChild(careerCard);
    });

    if (strengths && strengths.length > 0) {
      strengthsSection.style.display = 'block';
      strengthsList.innerHTML = '';
      strengths.forEach(strength => {
        const li = document.createElement('li');
        li.textContent = strength;
        strengthsList.appendChild(li);
      });
    } else {
      strengthsSection.style.display = 'none';
    }

    const factualExplanation = document.createElement('p');
    factualExplanation.className = 'text-body_small color-green_light';
    factualExplanation.style.marginTop = 'var(--space-4)';
    factualExplanation.textContent = strengths.length
      ? `This profile's highest dimensions were ${strengths.map(label => label.replace(/^Strong | orientation$/g, '')).join(', ')}.`
      : 'Career alignment compares this profile with the defined career direction references.';
    resultsContent.appendChild(factualExplanation);

    renderCareerCourseRecommendations(topCareers);
  }

  async function renderCareerCourseRecommendations(topCareers) {
    try {
      const response = await fetch(`${API_BASE}/courses`);
      if (!response.ok) throw new Error(`Course catalog request failed: ${response.status}`);
      const catalog = await response.json();
      const coursesById = new Map((catalog.courses || []).map(course => [course.id, course]));
      const mappings = catalog.career_course_mapping || {};
      const usedCourseIds = new Set();
      const section = document.createElement('section');
      section.className = 'career-course-recommendations';

      const heading = document.createElement('h2');
      heading.className = 'text-h3';
      heading.style.marginTop = 'var(--space-8)';
      heading.textContent = 'Learning paths related to your career profile';
      section.appendChild(heading);

      topCareers.forEach(careerResult => {
        const careerName = careerResult.career;
        const relatedCourses = (mappings[careerName] || [])
          .map(id => coursesById.get(id))
          .filter(course => course && !usedCourseIds.has(course.id));
        if (!relatedCourses.length) return;

        const careerHeading = document.createElement('h3');
        careerHeading.className = 'text-h4';
        careerHeading.style.marginTop = 'var(--space-4)';
        careerHeading.textContent = careerName;
        section.appendChild(careerHeading);

        const list = document.createElement('ul');
        relatedCourses.forEach(course => {
          usedCourseIds.add(course.id);
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = `course-detail.html?id=${encodeURIComponent(course.id)}`;
          link.textContent = `${course.title} · ${course.category}`;
          item.appendChild(link);
          list.appendChild(item);
        });
        section.appendChild(list);
      });

      if (usedCourseIds.size) resultsContent.appendChild(section);
    } catch (error) {
      console.warn('Could not load courses related to this career profile:', error);
    }
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
