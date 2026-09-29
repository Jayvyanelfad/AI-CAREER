(async function () {
  const API_BASE = window.API_BASE || '/api';
  const CAREER_DIMENSIONS = [
    'Software Engineering',
    'Data & Analytical Thinking',
    'AI & Computational Intelligence',
    'Systems & Infrastructure',
    'Security & Reliability',
    'Product & User Orientation',
    'Design & Human Experience',
    'Leadership & Delivery'
  ];
  const message = document.getElementById('profile-message');
  const profileName = document.getElementById('profile-name-display');
  const profileEmail = document.getElementById('profile-email-display');
  const profileCareer = document.getElementById('profile-career-display');
  const profileNameInput = document.getElementById('profile-name');
  const profileEmailInput = document.getElementById('profile-email');
  const profileCareerInput = document.getElementById('profile-careerGoal');
  const editForm = document.getElementById('profile-edit-form');
  const profileContent = document.getElementById('profile-content');
  const saveButton = document.getElementById('save-btn');
  const dimensionsContainer = document.getElementById('career-dimensions');
  const careersContainer = document.getElementById('career-directions');
  const assessmentStatus = document.getElementById('career-assessment-status');
  const assessmentVersion = document.getElementById('assessment-version');
  const careerAction = document.getElementById('career-assessment-action');
  const careerRetry = document.getElementById('career-profile-retry');
  const careerStrengthsTitle = document.getElementById('career-strengths-title');
  const careerStrengths = document.getElementById('career-strengths');
  const personalError = document.getElementById('profile-personal-error');
  const enrollmentContainer = document.getElementById('profile-enrollments');
  const certificatesContainer = document.getElementById('profile-certificates');
  const recommendationSection = document.getElementById('career-recommendations-section');
  const recommendationStatus = document.getElementById('career-recommendations-status');
  const recommendationContainer = document.getElementById('career-recommendations');
  const whatsNextCopy = document.getElementById('profile-whats-next-copy');
  const whatsNextAction = document.getElementById('profile-whats-next-action');
  let careerProfileState = 'loading';
  let careerProfileResult = null;
  let courseCatalog = null;
  let courseCatalogLoaded = false;
  let enrolledCourses = null;
  let learningLoadFailed = false;

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.display = 'block';
    message.style.color = isError ? 'var(--danger)' : 'var(--primary)';
    setTimeout(() => { message.style.display = 'none'; }, 4000);
  }

  function addText(parent, tagName, text, className = '') {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function hasValidCareerProfile(result) {
    if (!result || result.assessment_version !== 'career-profile-v1') return false;
    const scores = result.dimension_scores;
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return false;
    if (!CAREER_DIMENSIONS.every(dimension => isFiniteNumber(scores[dimension]))) return false;
    if (!Array.isArray(result.top_careers) || result.top_careers.length === 0) return false;
    return result.top_careers.every(item =>
      item && typeof item.career === 'string' && item.career.trim() && isFiniteNumber(item.score)
    );
  }

  function enrollmentProgress(enrollment) {
    const available = enrollment.progressAvailable !== false && isFiniteNumber(enrollment.progress);
    return {
      available,
      value: available ? Math.max(0, Math.min(100, enrollment.progress)) : null
    };
  }

  function getMappedCourses() {
    if (!careerProfileResult || !courseCatalog || !Array.isArray(courseCatalog.courses) || !enrolledCourses) return [];
    const mapping = courseCatalog.career_course_mapping;
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return [];

    const coursesById = new Map(courseCatalog.courses
      .filter(course => course && typeof course.id === 'string' && course.id.trim() && typeof course.title === 'string' && course.title.trim())
      .map(course => [course.id, course]));
    const enrolledIds = new Set(enrolledCourses
      .filter(enrollment => enrollment && typeof enrollment.courseId === 'string')
      .map(enrollment => enrollment.courseId));
    const seenIds = new Set();
    const mapped = [];

    for (const career of careerProfileResult.top_careers) {
      const ids = mapping[career.career];
      if (!Array.isArray(ids)) continue;
      for (const courseId of ids) {
        if (typeof courseId !== 'string' || seenIds.has(courseId)) continue;
        seenIds.add(courseId);
        const course = coursesById.get(courseId);
        if (!course) continue;
        mapped.push({ course, career: career.career, enrolled: enrolledIds.has(courseId) });
      }
    }
    return mapped;
  }

  function renderWhatsNext() {
    whatsNextAction.hidden = true;
    if (careerProfileState === 'loading') {
      whatsNextCopy.textContent = t('coverage.findingNextStep', 'Finding a next step from your profile...');
      return;
    }
    if (careerProfileState === 'none') {
      whatsNextCopy.textContent = t('coverage.completeAssessmentForProfile', 'Complete your Career Assessment to discover your career profile.');
      whatsNextAction.textContent = t('coverage.completeAssessmentAction', 'Complete Career Assessment');
      whatsNextAction.href = 'career-test.html';
      whatsNextAction.hidden = false;
      return;
    }

    if (Array.isArray(enrolledCourses) && enrolledCourses.length > 0) {
      const nextEnrollment = enrolledCourses.find(enrollment => {
        const progress = enrollmentProgress(enrollment);
        return !progress.available || progress.value < 100;
      });
      if (nextEnrollment) {
        const hasCourseId = typeof nextEnrollment.courseId === 'string' && nextEnrollment.courseId.trim();
        whatsNextCopy.textContent = hasCourseId
          ? t('coverage.pickUpLearning', 'Pick up where you left off in your learning.')
          : t('coverage.openCatalogContinue', 'Open the course catalog to continue your learning.');
        whatsNextAction.textContent = hasCourseId ? t('coverage.continueLearningButton', 'Continue Learning') : t('ui.exploreCourses', 'Explore Courses');
        whatsNextAction.href = hasCourseId
          ? `course-detail.html?id=${encodeURIComponent(nextEnrollment.courseId)}`
          : 'courses.html';
        whatsNextAction.hidden = false;
        return;
      }
      if (enrolledCourses.every(enrollment => enrollmentProgress(enrollment).available && enrollmentProgress(enrollment).value >= 100)) {
        const nextRecommendation = getMappedCourses().find(item => !item.enrolled);
        whatsNextCopy.textContent = nextRecommendation
          ? t('coverage.coursesCompleteExplore', 'Your enrolled courses are complete. Explore another course for your career profile.')
          : t('coverage.coursesCompleteCatalog', 'Your enrolled courses are complete. Explore the course catalog for your next course.');
        whatsNextAction.textContent = t('coverage.exploreNextCourse', 'Explore Your Next Course');
        whatsNextAction.href = nextRecommendation
          ? `course-detail.html?id=${encodeURIComponent(nextRecommendation.course.id)}`
          : 'courses.html';
        whatsNextAction.hidden = false;
        return;
      }
    }

    if (enrolledCourses === null && !learningLoadFailed) {
      whatsNextCopy.textContent = t('coverage.checkingLearningStatus', 'Checking your learning status...');
      return;
    }
    if (learningLoadFailed) {
      whatsNextCopy.textContent = t('coverage.nextStepUnavailable', 'Your next step will appear when your learning status is available.');
      return;
    }
    if (careerProfileState === 'error') {
      whatsNextCopy.textContent = t('coverage.careerProfileUnavailableNext', 'Your next step could not be determined because your Career Profile is unavailable.');
      return;
    }
    if (courseCatalogLoaded) {
      const nextRecommendation = getMappedCourses().find(item => !item.enrolled);
      whatsNextCopy.textContent = nextRecommendation
        ? t('coverage.startCareerCourse', 'Start learning with a course connected to your Career Profile.')
        : t('coverage.browseCatalogNext', 'Browse the course catalog to choose what to learn next.');
      whatsNextAction.textContent = nextRecommendation ? t('coverage.startLearningStep', 'Start Learning') : t('ui.exploreCourses', 'Explore Courses');
      whatsNextAction.href = nextRecommendation
        ? `course-detail.html?id=${encodeURIComponent(nextRecommendation.course.id)}`
        : 'courses.html';
      whatsNextAction.hidden = false;
    } else {
      whatsNextCopy.textContent = t('coverage.profileReadyBrowse', 'Your Career Profile is ready. Browse courses to start learning.');
      whatsNextAction.textContent = t('ui.exploreCourses', 'Explore Courses');
      whatsNextAction.href = 'courses.html';
      whatsNextAction.hidden = false;
    }
  }

  async function getToken() {
    if (typeof window.getAuthAccessToken === 'function') {
      return window.getAuthAccessToken();
    }
    return localStorage.getItem('token');
  }

  async function apiRequest(path, options = {}) {
    const token = await getToken();
    if (!token) {
      window.location.href = 'login.html';
      throw new Error('Authentication required');
    }
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      throw new Error('Your session has expired. Please sign in again.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function loadPersonalInformation() {
    try {
      const profile = await apiRequest('/auth/me');
      const name = profile.full_name || profile.name || 'User';
      const goal = profile.career_goal || profile.careerGoal || 'undecided';
      profileName.textContent = name;
      profileEmail.textContent = profile.email || '';
      profileCareer.textContent = goal === 'undecided' ? t('coverage.notSet', 'Not set') : (profileCareerInput.selectedOptions[0]?.textContent || goal);
      profileNameInput.value = name === 'User' ? '' : name;
      profileEmailInput.value = profile.email || '';
      personalError.hidden = true;
      document.getElementById('edit-profile-btn').disabled = false;

      // Preserve real existing goals that are not in the current option list.
      if (![...profileCareerInput.options].some(option => option.value === goal)) {
        const option = document.createElement('option');
        option.value = goal;
        option.textContent = goal;
        profileCareerInput.appendChild(option);
      }
      profileCareerInput.value = goal;
    } catch (error) {
      if (error.status === 401 || error.message === 'Authentication required') return;
      [profileName, profileEmail, profileCareer].forEach(field => { field.textContent = t('coverage.profileInfoUnavailable', 'Unavailable'); });
      profileNameInput.value = '';
      profileEmailInput.value = '';
      document.getElementById('edit-profile-btn').disabled = true;
      personalError.textContent = t('coverage.profilePersonalError', 'Personal information could not be loaded. Please try again later.');
      personalError.hidden = false;
      console.error('Personal information load failed:', error);
    }
  }

  function showNoCareerProfile() {
    careerProfileState = 'none';
    careerProfileResult = null;
    assessmentStatus.textContent = t('coverage.assessmentProfileBuild', 'Complete the Career Assessment to build your career profile.');
    assessmentVersion.textContent = '';
    careerAction.textContent = t('coverage.startAssessment', 'Start Career Assessment');
    careerAction.hidden = true;
    careerRetry.hidden = true;
    dimensionsContainer.replaceChildren();
    careersContainer.replaceChildren();
    careerStrengths.replaceChildren();
    careerStrengths.hidden = true;
    careerStrengthsTitle.hidden = true;
    document.getElementById('career-directions-title').hidden = true;
    document.getElementById('career-alignment-title').hidden = true;
    document.getElementById('career-interests-title').hidden = true;
    renderRecommendations();
    renderWhatsNext();
  }

  function showCareerProfileError() {
    careerProfileState = 'error';
    careerProfileResult = null;
    assessmentStatus.textContent = t('coverage.careerProfileError', 'Your career profile could not be displayed right now.');
    assessmentVersion.textContent = '';
    careerAction.hidden = true;
    careerRetry.hidden = false;
    dimensionsContainer.replaceChildren();
    careersContainer.replaceChildren();
    careerStrengths.replaceChildren();
    careerStrengths.hidden = true;
    careerStrengthsTitle.hidden = true;
    document.getElementById('career-directions-title').hidden = true;
    document.getElementById('career-alignment-title').hidden = true;
    document.getElementById('career-interests-title').hidden = true;
    renderRecommendations();
    renderWhatsNext();
  }

  function renderCareerProfile(result) {
    if (!hasValidCareerProfile(result)) {
      showCareerProfileError();
      return;
    }
    const scores = result.dimension_scores;
    const topCareers = result.top_careers;

    careerProfileState = 'completed';
    careerProfileResult = result;
    assessmentStatus.textContent = t('coverage.assessmentCompleted', 'Assessment completed');
    careerAction.hidden = false;
    careerAction.textContent = t('coverage.retakeAssessment', 'Retake Assessment');
    careerRetry.hidden = true;
    document.getElementById('career-directions-title').hidden = false;
    document.getElementById('career-alignment-title').hidden = false;
    document.getElementById('career-interests-title').hidden = false;
    assessmentVersion.textContent = t('coverage.assessmentVersion', 'Assessment version: {version}', { version: result.assessment_version });
    dimensionsContainer.replaceChildren();
    Object.entries(scores).filter(([dimension]) => CAREER_DIMENSIONS.includes(dimension)).forEach(([dimension, rawScore]) => {
      const score = Math.max(0, Math.min(100, Math.round(rawScore * 100)));
      const row = document.createElement('div');
      row.className = 'profile-dimension';
      const label = addText(row, 'span', dimension, 'text-body_small color-bege_light');
      const progress = document.createElement('progress');
      progress.max = 100;
      progress.value = score;
      progress.setAttribute('aria-label', t('coverage.profileScoreAria', '{dimension} career profile score', { dimension }));
      const value = addText(row, 'span', `${score}%`, 'text-body_small color-green_light');
      row.insertBefore(progress, value);
      dimensionsContainer.appendChild(row);
      label.title = t('coverage.profileScoreAria', '{dimension} career profile score', { dimension });
    });

    careersContainer.replaceChildren();
    topCareers.forEach(item => {
      const row = document.createElement('div');
      row.className = 'career-alignment-row';
      addText(row, 'strong', item.career, 'text-h4 color-bege_light');
      addText(row, 'span', t('coverage.careerAlignmentPercent', '{percent}% Career Alignment', { percent: item.score }), 'career-alignment-score');
      const alignment = document.createElement('progress');
      alignment.max = 100;
      alignment.value = item.score;
      alignment.setAttribute('aria-label', t('coverage.careerAlignmentAria', '{career} Career Alignment', { career: item.career }));
      alignment.className = 'career-alignment-indicator';
      row.appendChild(alignment);
      careersContainer.appendChild(row);
    });

    const strengths = Array.isArray(result.strengths)
      ? result.strengths.filter(strength => typeof strength === 'string' && strength.trim())
      : [];
    careerStrengths.replaceChildren();
    strengths.forEach(strength => addText(careerStrengths, 'li', strength.trim()));
    careerStrengths.hidden = strengths.length === 0;
    careerStrengthsTitle.hidden = strengths.length === 0;
    renderRecommendations();
    renderWhatsNext();
  }

  async function loadCareerProfile() {
    try {
      const data = await apiRequest('/career-test');
      renderCareerProfile(data.result || {});
    } catch (error) {
      if (error.status === 404) {
        showNoCareerProfile();
        return;
      }
      if (error.status === 401 || error.message === 'Authentication required' || window.location.pathname.endsWith('login.html')) return;
      showCareerProfileError();
      console.error('Career Profile load failed:', error);
    }
  }

  careerRetry.addEventListener('click', () => loadCareerProfile());

  function renderRecommendations() {
    const shouldShow = careerProfileState === 'completed' && Boolean(careerProfileResult);
    recommendationSection.hidden = !shouldShow;
    recommendationContainer.replaceChildren();
    if (!shouldShow) {
      recommendationStatus.textContent = '';
      return;
    }
    if (!courseCatalogLoaded) {
      recommendationStatus.textContent = t('coverage.careerAlignedLoading', 'Loading career-aligned courses...');
      return;
    }
    if (!courseCatalog) {
      recommendationStatus.textContent = t('coverage.careerAlignedUnavailable', 'Career-aligned courses could not be loaded right now.');
      return;
    }
    if (enrolledCourses === null) {
      recommendationStatus.textContent = learningLoadFailed
        ? t('coverage.careerAlignedEnrollMissing', 'Career-aligned courses could not be displayed because enrollment status is unavailable.')
        : 'Loading career-aligned courses...';
      return;
    }

    const mappedCourses = getMappedCourses();
    const availableCourses = mappedCourses.filter(item => !item.enrolled).slice(0, 3);
    if (availableCourses.length === 0) {
      recommendationStatus.textContent = mappedCourses.length > 0
        ? t('coverage.alreadyLearningMapped', 'You are already learning the courses currently mapped to your top career directions.')
        : t('coverage.noMappedCourses', 'No mapped courses are currently available in the course catalog.');
      return;
    }

    recommendationStatus.textContent = '';
    availableCourses.forEach(({ course, career }) => {
      const card = document.createElement('article');
      card.className = 'profile-recommendation-card';
      addText(card, 'p', t('coverage.forCareer', 'For {career}', { career }), 'profile-recommendation-career');
      addText(card, 'h3', t(`courseMetadata.${course.id}.title`, course.title), 'text-h4 color-bege_light');
      if (typeof course.category === 'string' && course.category.trim() && course.category !== 'Uncategorized') {
        addText(card, 'p', course.category, 'profile-recommendation-category');
      }
      if (typeof course.description === 'string' && course.description.trim()) {
        addText(card, 'p', t(`courseMetadata.${course.id}.description`, course.description.trim()), 'profile-recommendation-description');
      }
      const link = document.createElement('a');
      link.href = `course-detail.html?id=${encodeURIComponent(course.id)}`;
      link.className = 'btn-outline';
      link.textContent = t('coverage.shortlistCourse', 'Explore Course');
      card.appendChild(link);
      recommendationContainer.appendChild(card);
    });
  }

  async function loadCourseCatalog() {
    try {
      courseCatalog = await apiRequest('/courses');
      if (!courseCatalog || !Array.isArray(courseCatalog.courses) || !courseCatalog.career_course_mapping) {
        courseCatalog = null;
      }
    } catch (error) {
      if (error.status === 401 || error.message === 'Authentication required') return;
      courseCatalog = null;
      console.error('Course catalog load failed:', error);
    } finally {
      courseCatalogLoaded = true;
      renderRecommendations();
      renderWhatsNext();
    }
  }

  function renderEnrollments(enrollments) {
    enrollmentContainer.replaceChildren();
    if (enrollments.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-body_small color-green_light';
      empty.append(t('coverage.journeyStartsHere', 'Your learning journey starts here. '));
      const link = document.createElement('a');
      link.href = 'courses.html';
      link.className = 'btn-outline profile-empty-action';
      link.textContent = t('ui.exploreCourses', 'Explore Courses');
      empty.appendChild(link);
      enrollmentContainer.appendChild(empty);
      return;
    }

    enrollments.forEach(enrollment => {
      const card = document.createElement('article');
      card.className = 'dashboard-card profile-course-card';
      const progressState = enrollmentProgress(enrollment);
      const progressAvailable = progressState.available;
      const progress = progressState.value;
      addText(card, 'h3', enrollment.courseName || 'Course', 'text-h4 color-bege_light');
      if (progressAvailable) {
        addText(card, 'p', t('coverage.profileCourseComplete', '{percent}% complete', { percent: progress }), 'text-body_small color-green_light');
        const bar = document.createElement('progress');
        bar.max = 100;
        bar.value = progress;
        bar.setAttribute('aria-label', t('coverage.courseProgressAria', '{course} progress', { course: enrollment.courseName || 'Course' }));
        card.appendChild(bar);
      } else {
        addText(card, 'p', t('coverage.progressUnavailable', 'Progress unavailable'), 'text-body_small color-green_light');
      }
      const completed = progressAvailable && progress >= 100;
      if (completed) {
        addText(card, 'p', t('coverage.courseCompleted', 'Course completed'), 'text-body_small color-green_light');
      } else {
        const nextLessonTitle = typeof enrollment.nextLessonTitle === 'string' ? enrollment.nextLessonTitle.trim() : '';
        if (nextLessonTitle && nextLessonTitle.toLowerCase() !== 'next lesson') {
          addText(card, 'p', t('coverage.continueWithLesson', 'Continue with: {lesson}', { lesson: nextLessonTitle }), 'text-body_small color-green_light');
        }
      }
      const link = document.createElement('a');
      const hasCourseId = typeof enrollment.courseId === 'string' && enrollment.courseId.trim();
      link.href = hasCourseId ? `course-detail.html?id=${encodeURIComponent(enrollment.courseId)}` : 'courses.html';
      link.className = 'btn-primary profile-course-action';
      link.textContent = hasCourseId ? (completed ? t('coverage.viewCourseLower', 'View course') : t('coverage.continueLearning', 'Continue learning')) : t('coverage.exploreCoursesLower', 'Explore courses');
      card.appendChild(link);
      enrollmentContainer.appendChild(card);
    });
  }

  function renderCertificates(certificates) {
    certificatesContainer.replaceChildren();
    if (!Array.isArray(certificates) || certificates.length === 0) {
      addText(certificatesContainer, 'p', t('coverage.noCertificates', 'No certificates yet.'), 'text-body_small color-green_light');
      const link = document.createElement('a');
      link.href = 'courses.html';
      link.className = 'btn-outline profile-empty-action';
      link.textContent = t('ui.exploreCourses', 'Explore Courses');
      certificatesContainer.appendChild(link);
      return;
    }
    certificates.forEach(certificate => {
      const item = document.createElement('article');
      item.className = 'profile-certificate-card';
      addText(item, 'h3', certificate.course_name || 'Certificate', 'text-h4 color-bege_light');
      if (certificate.earned_at) {
        const earnedAt = new Date(certificate.earned_at);
        if (Number.isFinite(earnedAt.getTime())) {
          addText(item, 'p', t('coverage.earnedDate', 'Earned {date}', { date: new Intl.DateTimeFormat(document.documentElement.lang).format(earnedAt) }), 'text-body_small color-green_light');
        }
      }
      if (typeof certificate.id === 'string' && certificate.id.trim()) {
        const link = document.createElement('a');
        link.href = `certificate.html?certificateId=${encodeURIComponent(certificate.id)}`;
        link.className = 'btn-outline';
        link.textContent = t('coverage.viewCertificate', 'View Certificate');
        item.appendChild(link);
      }
      certificatesContainer.appendChild(item);
    });
  }

  async function loadLearningAndAchievements() {
    try {
      const dashboard = await apiRequest('/dashboard');
      if (Array.isArray(dashboard.enrollments)) {
        enrolledCourses = dashboard.enrollments;
        renderEnrollments(enrolledCourses);
      } else {
        enrolledCourses = null;
        enrollmentContainer.replaceChildren();
        addText(enrollmentContainer, 'p', 'Your enrolled courses could not be loaded. Please try again later.', 'profile-error');
      }
      if (Array.isArray(dashboard.certificates)) {
        renderCertificates(dashboard.certificates);
      } else {
        certificatesContainer.replaceChildren();
        addText(certificatesContainer, 'p', 'Your certificates could not be loaded. Please try again later.', 'profile-error');
      }
      learningLoadFailed = !Array.isArray(dashboard.enrollments);
      renderRecommendations();
      renderWhatsNext();
    } catch (error) {
      if (error.status === 401 || error.message === 'Authentication required') return;
      learningLoadFailed = true;
      enrolledCourses = null;
      enrollmentContainer.replaceChildren();
      certificatesContainer.replaceChildren();
      addText(enrollmentContainer, 'p', 'Your enrolled courses could not be loaded. Please try again later.', 'profile-error');
      addText(certificatesContainer, 'p', 'Your certificates could not be loaded. Please try again later.', 'profile-error');
      renderRecommendations();
      renderWhatsNext();
      console.error('Learning and achievements load failed:', error);
    }
  }

  editForm.addEventListener('submit', async event => {
    event.preventDefault();
    saveButton.disabled = true;
    try {
      const data = await apiRequest('/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: profileNameInput.value.trim(),
          careerGoal: profileCareerInput.value
        })
      });
      profileName.textContent = data.full_name || data.name || profileNameInput.value.trim();
      const goal = data.career_goal || data.careerGoal || profileCareerInput.value;
      profileCareer.textContent = goal === 'undecided' ? t('coverage.notSet', 'Not set') : (profileCareerInput.querySelector(`option[value="${CSS.escape(goal)}"]`)?.textContent || goal);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      stored.name = profileName.textContent;
      stored.email = profileEmail.textContent;
      stored.careerGoal = goal;
      localStorage.setItem('user', JSON.stringify(stored));
      editForm.hidden = true;
      profileContent.hidden = false;
      showMessage('Profile updated.');
    } catch (error) {
      showMessage(error.message || 'Could not save your profile.', true);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    profileContent.hidden = true;
    editForm.hidden = false;
    profileNameInput.focus();
  });
  document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    editForm.hidden = true;
    profileContent.hidden = false;
  });

  const token = await getToken();
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  await Promise.allSettled([
    loadPersonalInformation(),
    loadCareerProfile(),
    loadLearningAndAchievements(),
    loadCourseCatalog()
  ]);
})();
