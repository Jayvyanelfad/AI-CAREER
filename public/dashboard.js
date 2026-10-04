// Authenticated Dashboard presentation. Assessment results and learning progress
// are read from the existing API; this page does not calculate or persist them.
(function () {
async function initializeDashboard() {
  if (window.setCareerPathLanguage) await window.setCareerPathLanguage(window.getCareerPathLanguage());
  const API_BASE = window.API_BASE || '/api';
  const $ = selector => document.querySelector(selector);
  const t = (key, fallback, vars) => window.t ? window.t(key, fallback, vars) : (fallback || key);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const careerRoleKeys = {
    'AI/ML Engineer': 'careerRoleAi', 'Software Developer': 'careerRoleSoftware',
    'Data Scientist': 'careerRoleData', 'UI/UX Designer': 'careerRoleDesign',
    'Full Stack Developer': 'careerRoleFullStack', 'Frontend Developer': 'careerRoleFrontend',
    'Backend Developer': 'careerRoleBackend', 'Data Analyst': 'careerRoleAnalyst',
    'Cloud Architect': 'careerRoleCloud', 'DevOps Engineer': 'careerRoleDevops',
    'Product Manager': 'careerRoleProduct'
  };
  const dimensionKeys = {
    'Software Engineering': 'signalSoftware', 'Data & Analytical Thinking': 'signalAnalysis',
    'AI & Computational Intelligence': 'signalIntelligentSystems', 'Systems & Infrastructure': 'signalSystems',
    'Security & Reliability': 'signalSecurity', 'Product & User Orientation': 'signalProduct',
    'Design & Human Experience': 'signalDesign', 'Leadership & Delivery': 'signalLeadership'
  };
  const careerDomain = career => window.CAREER_DIRECTION_BY_ROLE?.[career] || 'software';
  const token = await window.careerPathAuthReady;
  if (!token) { window.location.href = 'login.html'; return; }

  const response = await fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (response && response.status === 401) {
    localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'login.html'; return;
  }
  if (!response || !response.ok) {
    $('#welcome-subtitle').textContent = t('dashboardHome.loadError', 'We could not load your dashboard. Please refresh and try again.');
    $('#career-summary').textContent = t('dashboardHome.loadError', 'We could not load your dashboard. Please refresh and try again.');
    $('#courses-grid').textContent = t('dashboardHome.loadError', 'We could not load your dashboard. Please refresh and try again.');
    $('#certificates-grid').textContent = '';
    return;
  }
  const data = await response.json();
  const user = data.user || {};
  const assessment = data.careerTest && data.careerTest.completed && data.careerTest.assessmentVersion === 'career-profile-v1' ? data.careerTest : null;
  const firstName = (user.name || '').trim().split(/\s+/)[0] || t('dashboardHome.learner', 'there');
  $('#dashboard-welcome').textContent = t(assessment ? 'dashboardHome.welcomeReturning' : 'dashboardHome.welcomeNew', assessment ? 'Welcome back, {name}' : 'Welcome, {name}', { name: firstName });
  $('#welcome-subtitle').textContent = assessment
    ? t('dashboardHome.returningCopy', 'Pick up where you left off, or explore a new direction.')
    : t('dashboardHome.newCopy', 'Start by discovering a direction that feels right for you.');
  const primary = $('#welcome-primary');
  primary.href = assessment ? 'courses.html' : 'career-test.html';
  primary.textContent = t(assessment ? 'dashboardHome.exploreCourses' : 'dashboardHome.takeTest', assessment ? 'Explore courses' : 'Take the Career Test');
  const secondary = $('#welcome-secondary');
  if (assessment) { secondary.hidden = false; secondary.textContent = t('dashboardHome.viewInsights', 'View Career Insights'); secondary.href = 'career-test.html?view=result'; }
  const avatarFallback = $('#dashboard-avatar-fallback');
  const avatarImage = $('#dashboard-avatar-image');
  avatarFallback.textContent = firstName.slice(0, 1).toLocaleUpperCase();
  if (user.avatarUrl) { avatarImage.src = user.avatarUrl; avatarImage.onload = () => { avatarImage.hidden = false; }; avatarImage.onerror = () => { avatarImage.hidden = true; }; }
  window.updateCareerPathProfileIdentity?.(user);

  const careerSummary = $('#career-summary');
  if (!assessment) {
    const empty = el('div', 'empty-panel');
    empty.append(el('p', '', t('dashboardHome.noAssessment', 'Your career direction will appear here after you take the Career Test.')));
    const link = el('a', 'text-link', t('dashboardHome.takeTest', 'Take the Career Test'));
    link.href = 'career-test.html'; empty.append(link); careerSummary.append(empty);
  } else {
    const topCareer = Array.isArray(assessment.topCareers) ? assessment.topCareers[0] : null;
    const career = typeof topCareer === 'string' ? topCareer : topCareer?.career;
    const direction = el('div', 'insight-panel');
    const copy = el('div', 'insight-direction');
    copy.append(el('p', 'eyebrow', t('dashboardHome.yourDirection', 'YOUR CAREER DIRECTION')));
    copy.append(el('h3', '', t(`careerResult.domain.${careerDomain(career || '')}`, t('dashboardHome.directionFallback', 'Your next direction'))));
    if (career) copy.append(el('p', 'direction-domain', t(`dashboardHome.${careerRoleKeys[career] || ''}`, career)));
    direction.append(copy);
    const signals = el('div', 'signals');
    signals.append(el('h4', '', t('dashboardHome.signalsTitle', 'What we noticed')));
    const list = el('ul');
    const scores = assessment.dimensionScores && typeof assessment.dimensionScores === 'object' ? assessment.dimensionScores : {};
    const dimensions = Object.entries(scores).filter(([, score]) => Number.isFinite(Number(score))).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3);
    dimensions.forEach(([dimension]) => list.append(el('li', '', t(`dashboardHome.${dimensionKeys[dimension] || ''}`, dimension))));
    if (dimensions.length === 0 && Array.isArray(assessment.strengths)) assessment.strengths.slice(0, 3).forEach(signal => list.append(el('li', '', String(signal).replace(/^Strong /, '').replace(/ orientation$/i, ''))));
    signals.append(list); direction.append(signals);
    const action = el('a', 'button button-primary', t('dashboardHome.viewInsights', 'View Career Insights'));
    action.href = 'career-test.html?view=result'; direction.append(action); careerSummary.append(direction);
  }

  const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
  const coursesGrid = $('#courses-grid');
  if (!enrollments.length) {
    const empty = el('div', 'empty-panel');
    empty.append(el('p', '', t('dashboardHome.noEnrolledCourses', 'Your courses will show here once you enroll.')));
    const link = el('a', 'text-link', t('dashboardHome.exploreCourses', 'Explore courses')); link.href = 'courses.html'; empty.append(link); coursesGrid.append(empty);
  } else {
    enrollments.forEach(enrollment => {
      if (!enrollment || typeof enrollment.courseId !== 'string') return;
      const card = el('article', 'learning-card');
      const title = t(`courseMetadata.${enrollment.courseId}.title`, enrollment.courseName || t('dashboardHome.courseFallback', 'Course'));
      card.append(el('p', 'eyebrow', t('dashboardHome.inProgress', 'IN PROGRESS')));
      card.append(el('h3', '', title));
      const progress = Number(enrollment.progress);
      if (enrollment.progressAvailable && Number.isFinite(progress)) {
        const validProgress = Math.max(0, Math.min(100, progress));
        const label = el('p', 'progress-label', t('dashboardHome.progress', '{percent}% complete', { percent: validProgress }));
        card.append(label);
        const meter = el('div', 'progress-track'); meter.setAttribute('role', 'progressbar'); meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', '100'); meter.setAttribute('aria-valuenow', String(validProgress));
        const fill = el('span'); fill.style.width = `${validProgress}%`; meter.append(fill); card.append(meter);
      }
      if (typeof enrollment.nextLessonTitle === 'string' && enrollment.nextLessonTitle.trim()) card.append(el('p', 'next-lesson', t('dashboardHome.nextLesson', 'Next: {lesson}', { lesson: enrollment.nextLessonTitle })));
      const link = el('a', 'text-link', t('coverage.continueLearning', 'Continue learning')); link.href = `course-detail.html?id=${encodeURIComponent(enrollment.courseId)}`; card.append(link);
      coursesGrid.append(card);
    });
  }

  const certificates = Array.isArray(data.certificates) ? data.certificates.filter(c => c && typeof c.id === 'string') : [];
  const certificateGrid = $('#certificates-grid');
  if (!certificates.length) certificateGrid.append(el('p', 'empty-copy', t('dashboardHome.noCertificates', 'Certificates you earn will appear here.')));
  else certificates.forEach(certificate => {
    const card = el('article', 'certificate-card');
    card.append(el('h3', '', certificate.course_name || t('coverage.certificateTitle', 'CareerPath AI Certificate')));
    if (certificate.earned_at) { const date = new Date(certificate.earned_at); if (Number.isFinite(date.getTime())) card.append(el('p', 'muted-copy', t('dashboardHome.issued', 'Issued {date}', { date: new Intl.DateTimeFormat(document.documentElement.lang).format(date) }))); }
    const link = el('a', 'text-link', t('coverage.viewCertificateButton', 'View certificate')); link.href = `certificate.html?certificateId=${encodeURIComponent(certificate.id)}`; card.append(link); certificateGrid.append(card);
  });

  await renderExploreCourses(assessment, enrollments, token);

  async function renderExploreCourses(completedAssessment, currentEnrollments, accessToken) {
    const grid = $('#explore-grid');
    try {
      const [catalogResult, mappingResult, localeResult] = await Promise.allSettled([
        fetch(`${API_BASE}/courses`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('course-catalog-config.json'),
        fetch(`locales/${window.getCareerPathLanguage?.() || 'en'}.json`)
      ]);
      const catalogResponse = catalogResult.status === 'fulfilled' ? catalogResult.value : null;
      const mappingResponse = mappingResult.status === 'fulfilled' ? mappingResult.value : null;
      const localeResponse = localeResult.status === 'fulfilled' ? localeResult.value : null;
      const catalogData = catalogResponse?.ok ? await catalogResponse.json() : {};
      const mapping = mappingResponse?.ok ? await mappingResponse.json() : {};
      const localeData = localeResponse?.ok ? await localeResponse.json() : {};
      let catalog = Array.isArray(catalogData.courses) ? catalogData.courses : [];
      if (!catalog.length) {
        // The checked-in career map supplies authentic IDs; localized catalog
        // metadata supplies real titles and descriptions if the live endpoint
        // is unavailable (for example while a schema migration is pending).
        const metadata = localeData.courseMetadata || {};
        catalog = Object.entries(metadata).filter(([, course]) => course && typeof course.title === 'string')
          .map(([id, course]) => ({ id, title: course.title, description: course.description }));
      }
      const byId = new Map(catalog.filter(course => course && course.id).map(course => [course.id, course]));
      const career = completedAssessment?.topCareers?.[0]?.career || (typeof completedAssessment?.topCareers?.[0] === 'string' ? completedAssessment.topCareers[0] : '');
      const mappedIds = career && Array.isArray(mapping.careerCourseMapping?.[career]) ? mapping.careerCourseMapping[career] : [];
      const enrolledIds = new Set(currentEnrollments.map(enrollment => enrollment.courseId));
      const orderedIds = mappedIds.length ? [...mappedIds, ...catalog.map(course => course.id)] : catalog.map(course => course.id);
      const selected = orderedIds.map(id => byId.get(id)).filter((course, index, all) => course && all.indexOf(course) === index && !enrolledIds.has(course.id)).slice(0, 3);
      selected.forEach(course => {
        const card = el('article', 'explore-card');
        const category = mapping.courseCategories?.[course.id];
        if (category) card.append(el('p', 'eyebrow', category));
        const title = t(`courseMetadata.${course.id}.title`, course.title || course.name || '');
        const description = t(`courseMetadata.${course.id}.description`, course.description || '');
        card.append(el('h3', '', title));
        if (description) card.append(el('p', 'course-description', description));
        if (course.status === 'coming_soon') {
          card.append(el('p', 'course-availability', t('ui.comingSoon', 'Coming soon')));
        } else if (course.status === 'available') {
          const link = el('a', 'text-link', t('dashboardHome.viewCourse', 'View course')); link.href = `course-detail.html?id=${encodeURIComponent(course.id)}`; card.append(link);
        }
        grid.append(card);
      });
    } catch (_error) { /* The complete catalog remains available from the Courses page. */ }
    if (!grid.children.length) {
      const link = el('a', 'text-link', t('dashboardHome.browseCatalog', 'Browse catalog')); link.href = 'courses.html';
      grid.append(el('p', 'empty-copy', t('dashboardHome.catalogUnavailable', 'Browse the course catalog to find a place to begin.')), link);
    }
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeDashboard, { once: true });
else initializeDashboard();
})();
