(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const content = $('#page-content');
  const appContent = $('#app-content');
  const accessState = $('#access-state');
  const PAGE_SIZE = 25;
  const state = { token: '', locale: {}, lang: 'en', page: 1, query: '', overview: null, identity: '' };
  let sessionGeneration = 0;
  let sessionObserverInstalled = false;
  const titles = { overview: 'overview', users: 'users', assessments: 'careerAssessments', courses: 'courses', analytics: 'analytics' };

  function tr(key, vars = {}) {
    let value = state.locale[key] || key;
    for (const [name, replacement] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, String(replacement));
    return value;
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }
  function avatarMarkup(user) {
    const name = user.fullName || user.email || 'User';
    const initial = name.trim().slice(0, 1).toUpperCase() || 'U';
    const image = user.avatarUrl ? `<img src="${esc(user.avatarUrl)}" alt="" loading="lazy">` : '';
    return `<span class="user-avatar" aria-hidden="true"><span>${esc(initial)}</span>${image}</span>`;
  }
  function date(value) {
    if (!value) return tr('noValue');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return tr('noValue');
    return new Intl.DateTimeFormat(state.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }
  function number(value) { return new Intl.NumberFormat(state.lang).format(Number(value) || 0); }
  async function loadLocale() {
    const lang = window.getCareerPathLanguage?.() || document.documentElement.lang || 'en';
    state.lang = ['en', 'fr', 'hinglish', 'sw', 'ar'].includes(lang) ? lang : 'en';
    try {
      const response = await fetch(`admin-locales/${state.lang}.json`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('locale unavailable');
      state.locale = await response.json();
    } catch {
      state.lang = 'en';
      try { state.locale = await fetch('admin-locales/en.json').then(r => r.json()); } catch { state.locale = {}; }
    }
    const languageMeta = { en: 'en', fr: 'fr', hinglish: 'en-IN', sw: 'sw', ar: 'ar' };
    document.documentElement.lang = languageMeta[state.lang];
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-admin-i18n]').forEach(el => { el.textContent = tr(el.dataset.adminI18n); });
    if (state.identity) $('#admin-identity').textContent = state.identity;
    const active = location.hash.replace(/^#/, '').split('/')[0] || 'overview';
    $('#page-title').textContent = tr(titles[active] || 'journeyTitle');
  }
  async function getSession() {
    for (let attempt = 0; attempt < 35; attempt++) {
      if (window.supabase?.auth?.getSession) {
        const { data, error } = await window.supabase.auth.getSession();
        if (error) throw new Error('session');
        return data?.session || null;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('session');
  }
  async function api(path) {
    let session = null;
    try { session = await getSession(); } catch { /* Treat a missing browser session as unauthenticated. */ }
    if (!session?.access_token) {
      clearAdminSession();
      const error = new Error(tr('authRequired'));
      error.status = 401;
      throw error;
    }
    state.token = session.access_token;
    const generation = sessionGeneration;
    const response = await fetch(`/api/admin/${path}`, {
      headers: { Authorization: `Bearer ${state.token}`, Accept: 'application/json' }
    });
    let body;
    try { body = await response.json(); } catch { body = {}; }
    if (generation !== sessionGeneration) {
      const error = new Error(tr('authRequired'));
      error.status = 401;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(body.error || tr('loadError'));
      error.status = response.status;
      throw error;
    }
    return body;
  }
  function clearAdminSession() {
    sessionGeneration++;
    state.token = '';
    state.identity = '';
    appContent.hidden = true;
    accessState.hidden = false;
    $('#admin-identity').hidden = true;
    document.querySelectorAll('.admin-logout').forEach(button => { button.hidden = true; });
    setAccessError(401);
  }
  function observeSession() {
    const auth = window.supabase?.auth;
    if (sessionObserverInstalled || typeof auth?.onAuthStateChange !== 'function') return;
    sessionObserverInstalled = true;
    auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.access_token) {
        clearAdminSession();
        return;
      }
      state.token = session.access_token;
    });
  }
  function setAccessError(status) {
    const title = status === 401 ? tr('authRequired') : status === 403 ? tr('notAdmin') : status === 503 ? tr('setupUnavailable') : tr('genericError');
    const login = status === 401 ? `<a class="access-link" href="login.html">${esc(tr('login'))}</a>` : '';
    accessState.innerHTML = `<strong>${esc(tr('accessTitle'))}</strong><span>${esc(title)}</span>${login}<button class="btn secondary" id="retry-access">${esc(tr('retry'))}</button>`;
    $('#retry-access')?.addEventListener('click', initialize);
  }
  function loading(message = '') {
    content.innerHTML = `<div class="state-panel"><span class="spinner"></span><p>${esc(message || tr('checkingAccess'))}</p></div>`;
  }
  function sectionHeading(title, description) {
    return `<div class="section-heading"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div></div>`;
  }
  function empty(message) { return `<div class="empty">${esc(message)}</div>`; }
  function metric(label, value, icon = '◉', note = '') { return `<article class="metric-card"><div class="metric-topline"><span class="metric-label">${esc(label)}</span><span class="metric-icon" aria-hidden="true">${esc(icon)}</span></div><strong class="metric-value">${esc(number(value))}</strong>${note ? `<p class="metric-note">${esc(note)}</p>` : ''}</article>`; }
  function table(headers, rows, emptyMessage) {
    if (!rows.length) return empty(emptyMessage);
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${esc(h.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, i) => `<td data-label="${esc(headers[i]?.label || '')}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function chart(rows, labelKey, valueKey) {
    if (!rows.length || !rows.some(row => Number(row[valueKey]) > 0)) return empty(tr('noAnalytics'));
    const max = Math.max(...rows.map(row => Number(row[valueKey]) || 0), 1);
    return `<div class="chart-list">${rows.map(row => `<div class="chart-row"><span>${esc(row[labelKey] || tr('unknownCourse'))}</span><div class="bar"><span style="width:${Math.max(0, Math.min(100, (Number(row[valueKey]) || 0) / max * 100))}%"></span></div><b>${esc(number(row[valueKey]))}</b></div>`).join('')}</div>`;
  }
  async function renderOverview(data) {
    loading();
    try {
      const [analytics, recent] = await Promise.all([api('analytics'), api('assessments?page=1&perPage=5&completed=true')]);
      const recentItems = recent.attempts || [];
      const recentHtml = recentItems.length ? `<div class="recent-list">${recentItems.map(item => `<article class="recent-item"><span class="recent-pin" aria-hidden="true"></span><div><strong>${esc(item.topCareers?.[0]?.career || tr('assessmentRecord'))}</strong><p>${esc(tr('learnerId'))}: ${esc(item.userId)}</p></div><time>${esc(date(item.completedAt))}</time></article>`).join('')}</div>` : empty(tr('noRecentAssessments'));
      const careerChart = chart(analytics.careerDirectionDistribution || [], 'career', 'attempts');
      const courseRows = (analytics.courses || []).filter(course => Number(course.enrollments) > 0).slice(0, 5);
      const courseInsight = courseRows.length
        ? `<div class="course-insight-list">${courseRows.map(course => `<div class="course-insight-row"><span>${esc(course.courseName || tr('unknownCourse'))}</span><strong>${esc(number(course.enrollments))}</strong><small>${esc(tr('completion'))}: ${esc(number(course.completedEnrollments))}</small></div>`).join('')}</div>`
        : empty(tr('noCourses'));
      const passInsight = analytics.examPassRate === null || analytics.examPassRate === undefined
        ? empty(tr('noExamData'))
        : `<div class="insight-number">${esc(tr('percent', { value: analytics.examPassRate }))}</div><p class="muted">${esc(tr('examSummary', { passed: number(analytics.examsPassed), attempts: number(analytics.examAttempts) }))}</p>`;
      content.innerHTML = `<section class="overview-hero"><div class="overview-hero-copy"><p class="hero-kicker">${esc(tr('adminPerspective'))}</p><h2>${esc(tr('platformOverview'))}</h2><p>${esc(tr('overviewHeroCopy'))}</p><span class="hero-rule" aria-hidden="true"></span></div><span class="hero-index" aria-hidden="true">CP / 01</span></section>
        <div class="overview-section-label"><span>01</span><div><h2>${esc(tr('platformAtGlance'))}</h2><p>${esc(tr('overviewIntro'))}</p></div></div>
        <div class="metric-grid">${metric(tr('totalUsers'), data.totalUsers, '◉')}${metric(tr('assessmentAttempts'), data.completedAssessmentAttempts, '✳', tr('uniqueLearners') + ': ' + number(data.usersWithCompletedAssessment))}${metric(tr('coursesStarted'), data.coursesStarted, '↗')}${metric(tr('lessonsCompleted'), data.lessonsCompleted, '▤')}${metric(tr('examsAttempted'), data.examsAttempted, '⌑')}${metric(tr('certificatesIssued'), data.certificatesIssued, '◇')}</div>
        <section class="insights-block"><div class="overview-section-label"><span>02</span><div><h2>${esc(tr('keyInsights'))}</h2><p>${esc(tr('insightsCopy'))}</p></div></div><div class="insight-grid"><article class="insight-card insight-card--career"><h3>${esc(tr('careerDistribution'))}</h3>${careerChart}</article><article class="insight-card insight-card--support"><h3>${esc(tr('courseEnrollments'))}</h3>${courseInsight}<div class="support-divider"></div><div class="support-exam"><strong>${esc(tr('examPassRate'))}</strong>${passInsight}</div><p class="small-note">${esc(tr('lessonsCompleted'))}: ${esc(number(analytics.lessonsCompleted))}</p></article></div></section>
        <section class="recent-section"><div class="overview-section-label"><span>03</span><div><h2>${esc(tr('recentAssessments'))}</h2><p>${esc(tr('recentAssessmentNote'))}</p></div><a class="text-link" href="#assessments">${esc(tr('viewAll'))} →</a></div>${recentHtml}</section>
        <section class="data-notes-panel"><h3>${esc(tr('dataNotes'))}</h3><div class="data-notes"><p class="note-item">${esc(tr('attemptCountNote'))}</p><p class="note-item">${esc(tr('courseCountNote'))}</p><p class="note-item">${esc(tr('missingEventsNote'))}</p></div></section>`;
    } catch (error) { renderError(error); }
  }
  function pagination(page, total, change) {
    const pages = Math.max(1, Math.ceil((Number(total) || 0) / PAGE_SIZE));
    return `<div class="pagination"><button class="page-btn" data-page-change="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${esc(tr('previous'))}</button><span>${esc(tr('page', { page, pages }))}</span><button class="page-btn" data-page-change="${page + 1}" ${page >= pages ? 'disabled' : ''}>${esc(tr('next'))}</button></div>`;
  }
  async function renderUsers(page = 1, query = '') {
    state.page = page; state.query = query;
    loading();
    try {
      const params = new URLSearchParams({ page, perPage: PAGE_SIZE });
      if (query) params.set('q', query);
      const result = await api(`users?${params}`);
      const headers = ['name', 'email', 'joined', 'assessmentCount', 'retestCount', 'courseCount', 'certificates', 'journey'].map(key => ({ label: tr(key) }));
      const rows = result.users.map(user => [
        `<div class="user-identity">${avatarMarkup(user)}<span><span class="user-name">${esc(user.fullName || tr('noValue'))}</span><span class="subtext">${esc(user.id)}</span></span></div>`,
        esc(user.email || tr('noValue')), esc(date(user.joinedAt)), esc(number(user.assessmentCount)), esc(number(user.retestCount)), esc(number(user.courseCount)), esc(number(user.certificateCount)),
        `<a class="table-actions" href="#journey/${encodeURIComponent(user.id)}">${esc(tr('journey'))} ↗</a>`
      ]);
      content.innerHTML = `${sectionHeading(tr('userDirectory'), tr('usersIntro'))}<form class="toolbar search-panel" id="user-search"><span class="search-glyph" aria-hidden="true">⌕</span><input class="search-input" name="q" maxlength="80" minlength="2" placeholder="${esc(tr('searchHint'))}" value="${esc(query)}" aria-label="${esc(tr('searchHint'))}"><button class="btn" type="submit">${esc(tr('search'))} →</button></form>${table(headers, rows, tr('noUsers'))}${pagination(result.page, result.total)}`;
      $('#user-search').addEventListener('submit', event => { event.preventDefault(); const term = new FormData(event.currentTarget).get('q').trim(); renderUsers(1, term); });
      content.querySelectorAll('[data-page-change]').forEach(button => button.addEventListener('click', () => renderUsers(Number(button.dataset.pageChange), query)));
    } catch (error) { renderError(error); }
  }
  function careerTags(items) {
    return items?.length ? `<div class="career-tags">${items.map(item => `<span class="tag">${esc(item.career)}${item.score === null || item.score === undefined ? '' : ` · ${esc(item.score)}%`}</span>`).join('')}</div>` : `<span class="muted">${esc(tr('noValue'))}</span>`;
  }
  function dimensions(scores) {
    const entries = Object.entries(scores || {});
    if (!entries.length) return `<p class="muted">${esc(tr('noValue'))}</p>`;
    return entries.map(([name, score]) => {
      const value = Math.max(0, Math.min(100, Number(score) <= 1 ? Number(score) * 100 : Number(score)));
      return `<div class="score-row"><span>${esc(name)}</span><div class="bar"><span style="width:${value}%"></span></div><b>${Math.round(value)}%</b></div>`;
    }).join('');
  }
  function assessmentCard(attempt, index) {
    const label = index === 0 ? tr('initialTest') : tr('retest', { number: index });
    return `<details class="attempt" ${index === 0 ? 'open' : ''}><summary>${esc(label)} <time>${esc(date(attempt.completedAt))}</time></summary><div class="attempt-body"><p class="muted">${esc(tr('version'))}: ${esc(attempt.assessmentVersion || tr('noValue'))}</p><strong>${esc(tr('careerDirections'))}</strong>${careerTags(attempt.topCareers)}<strong>${esc(tr('dimensions'))}</strong>${dimensions(attempt.dimensionScores)}<strong>${esc(tr('strengths'))}</strong><div class="strength-list">${(attempt.strengths || []).map(item => `<span class="tag">${esc(item)}</span>`).join('') || esc(tr('noValue'))}</div></div></details>`;
  }
  function accountField(label, value) { return `<div class="account-field"><span>${esc(label)}</span><strong>${esc(value || tr('noValue'))}</strong></div>`; }
  async function renderJourney(userId) {
    loading();
    try {
      const result = await api(`users/${encodeURIComponent(userId)}`);
      const account = result.account || {};
      const history = result.assessments || [];
      const initialAssessment = history[0] ? assessmentCard(history[0], 0) : empty(tr('noAssessmentHistory'));
      const retests = history.slice(1).map((attempt, index) => assessmentCard(attempt, index + 1)).join('');
      const careerProfile = result.careerProfile;
      const courses = result.courses || [];
      const exams = result.exams || [];
      const certificates = result.certificates || [];
      const courseHtml = courses.length ? courses.map(course => `<article class="data-card"><h3>${esc(course.courseName || tr('unknownCourse'))}</h3><div class="stats-strip"><span class="stats-chip">${esc(tr('percent', { value: course.progressPercent }))}</span><span class="stats-chip">${esc(tr('lessons', { done: course.lessonsCompleted, total: course.totalLessons }))}</span></div><div class="progress-track" role="progressbar" aria-valuenow="${Number(course.progressPercent) || 0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(0, Math.min(100, Number(course.progressPercent) || 0))}%"></span></div><p>${esc(tr('joined'))}: ${esc(date(course.enrolledAt))}</p><p>${esc(tr('nextIncomplete'))}: ${esc(course.nextLesson?.title || tr('noNextLesson'))}</p></article>`).join('') : empty(tr('noCoursesEnrolled'));
      const examRows = exams.map(exam => [esc(exam.title || tr('unknownCourse')), esc(exam.courseId || tr('noValue')), esc(number(exam.attemptNumber)), esc(exam.score === null ? tr('noValue') : `${exam.score}%`), esc(exam.passed === true ? tr('passed') : exam.passed === false ? tr('failed') : tr('noValue')), esc(date(exam.startedAt)), esc(date(exam.submittedAt))]);
      const certificateHtml = certificates.length ? `<div class="cards-list">${certificates.map(certificate => `<article class="data-card"><h3>${esc(certificate.courseName || tr('unknownCourse'))}</h3><p>${esc(tr('certificateId'))}: ${esc(certificate.certificateId || tr('noValue'))}</p><p>${esc(tr('earned'))}: ${esc(date(certificate.earnedAt))}</p></article>`).join('')}</div>` : empty(tr('noCertificates'));
      content.innerHTML = `<div class="section-heading journey-page-heading"><div><a class="table-actions" href="#users">← ${esc(tr('backUsers'))}</a><div class="journey-identity">${avatarMarkup(account)}<div><p class="editorial-kicker">${esc(tr('journeyTitle'))}</p><h2>${esc(account.fullName || account.email || tr('journeyTitle'))}</h2></div></div></div></div>
        <section class="journey-section journey-about"><h3>${esc(tr('aboutLearner'))}</h3><div class="account-grid">${accountField(tr('name'), account.fullName)}${accountField(tr('email'), account.email)}${accountField(tr('careerGoal'), account.careerGoal)}${accountField(tr('bio'), account.bio)}${accountField(tr('joined'), date(account.joinedAt))}${accountField(tr('lastSignIn'), date(account.lastSignInAt))}</div></section>
        <div class="journey-grid journey-story">
          <section class="journey-section wide"><span class="journey-step">01</span><h3>${esc(tr('discovered'))}</h3><p class="editorial-kicker">${esc(tr('latestProfile'))}</p>${careerProfile ? `${careerTags(careerProfile.topCareers)}${dimensions(careerProfile.dimensionScores)}<div class="strength-list">${(careerProfile.strengths || []).map(item => `<span class="tag">${esc(item)}</span>`).join('')}</div>` : empty(tr('noAssessmentHistory'))}<div class="journey-entry"><p class="editorial-kicker">${esc(tr('careerAssessment'))} · ${esc(tr('initialTest'))}</p>${initialAssessment}</div></section>
          <section class="journey-section wide"><span class="journey-step">02</span><h3>${esc(tr('refined'))}</h3>${retests || empty(tr('noRetests'))}</section>
          <section class="journey-section wide"><span class="journey-step">03</span><h3>${esc(tr('startedLearning'))}</h3><div class="cards-list">${courseHtml}</div></section>
          <section class="journey-section wide"><span class="journey-step">04</span><h3>${esc(tr('validated'))}</h3>${table(['exam','course','attemptNumber','score','result','started','submitted'].map(key => ({ label: tr(key) })), examRows, tr('noExams'))}</section>
          <section class="journey-section wide"><span class="journey-step">05</span><h3>${esc(tr('achieved'))}</h3>${certificateHtml}</section>
        </div>`;
    } catch (error) { renderError(error); }
  }
  async function renderAssessments(page = 1) {
    loading();
    try {
      const result = await api(`assessments?page=${page}&perPage=${PAGE_SIZE}`);
      const cards = result.attempts.map(item => `<article class="assessment-archive-card"><div class="archive-meta"><time>${esc(date(item.completedAt))}</time><span>${esc(item.assessmentVersion || tr('noValue'))}</span><span>${esc(item.completed ? tr('completed') : tr('inProgress'))}</span></div><div class="archive-title-row"><h3>${esc(item.topCareers?.[0]?.career || tr('assessmentRecord'))}</h3><a href="#journey/${encodeURIComponent(item.userId)}" class="text-link">${esc(tr('viewLearner'))} →</a></div><p class="archive-user">${esc(tr('learnerId'))}: ${esc(item.userId)}</p><div class="archive-directions">${careerTags(item.topCareers)}</div><details class="archive-details"><summary>${esc(tr('dimensions'))} · ${esc(tr('strengths'))}</summary><div class="assessment-card-detail">${dimensions(item.dimensionScores)}<div class="strength-list">${(item.strengths || []).map(value => `<span class="tag">${esc(value)}</span>`).join('') || esc(tr('noValue'))}</div></div></details></article>`).join('');
      content.innerHTML = `${sectionHeading(tr('careerAssessments'), tr('assessmentsIntro'))}<div class="assessment-archive">${cards || empty(tr('noAssessments'))}</div>${pagination(result.page, result.total)}`;
      content.querySelectorAll('[data-page-change]').forEach(button => button.addEventListener('click', () => renderAssessments(Number(button.dataset.pageChange))));
    } catch (error) { renderError(error); }
  }
  async function renderCourses() {
    loading();
    try {
      const result = await api('analytics');
      const courses = result.courses || [];
      const cards = courses.map(course => `<article class="course-admin-card"><div class="course-art-placeholder" aria-hidden="true"><span>CP</span></div><div class="course-admin-copy"><p class="editorial-kicker">${esc(tr('readOnlyCourse'))}</p><h3>${esc(course.courseName || tr('unknownCourse'))}</h3><div class="course-admin-stats"><span>${esc(tr('enrollments'))} <strong>${esc(number(course.enrollments))}</strong></span><span>${esc(tr('completion'))} <strong>${esc(number(course.completedEnrollments))}</strong></span></div><div class="progress-track" role="progressbar" aria-valuenow="${course.enrollments ? Math.round(course.completedEnrollments / course.enrollments * 100) : 0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${course.enrollments ? Math.min(100, course.completedEnrollments / course.enrollments * 100) : 0}%"></span></div></div></article>`).join('');
      content.innerHTML = `${sectionHeading(tr('courses'), tr('courseIntro'))}<div class="note-box">${esc(tr('catalogFieldsUnavailable'))}</div><div class="course-admin-grid">${cards || empty(tr('noCourses'))}</div>`;
    } catch (error) { renderError(error); }
  }
  async function renderAnalytics() {
    loading();
    try {
      const result = await api('analytics');
      content.innerHTML = `${sectionHeading(tr('analytics'), tr('analyticsIntro'))}<div class="journey-grid"><section class="journey-section"><h3>${esc(tr('careerDistribution'))}</h3>${chart(result.careerDirectionDistribution || [], 'career', 'attempts')}</section><section class="journey-section"><h3>${esc(tr('courseEnrollments'))}</h3>${chart(result.courses || [], 'courseName', 'enrollments')}</section><section class="journey-section"><h3>${esc(tr('courseEnrollments'))} · ${esc(tr('completion'))}</h3>${chart(result.courses || [], 'courseName', 'completedEnrollments')}</section><section class="journey-section"><h3>${esc(tr('examPassRate'))}</h3>${result.examPassRate === null || result.examPassRate === undefined ? empty(tr('noAnalytics')) : `<strong class="metric-value">${esc(tr('percent', { value: result.examPassRate }))}</strong><p class="muted">${esc(tr('examSummary', { passed: number(result.examsPassed), attempts: number(result.examAttempts) }))}</p>`}<div class="stats-strip"><span class="stats-chip">${esc(tr('lessonsCompleted'))}: ${esc(number(result.lessonsCompleted))}</span><span class="stats-chip">${esc(tr('certificatesIssued'))}: ${esc(number((result.courses || []).reduce((n, course) => n + Number(course.certificatesIssued || 0), 0)))}</span></div></section></div><div class="note-box">${esc(tr('missingEventsNote'))}</div>`;
    } catch (error) { renderError(error); }
  }
  function renderError(error) {
    if (error.status === 401 || error.status === 403 || error.status === 503) {
      if (error.status === 401) { clearAdminSession(); return; }
      appContent.hidden = true; accessState.hidden = false; setAccessError(error.status); return;
    }
    content.innerHTML = `<div class="state-panel"><strong>${esc(tr('loadError'))}</strong><span>${esc(tr('genericError'))}</span><button class="btn secondary" id="retry-section">${esc(tr('retry'))}</button></div>`;
    $('#retry-section')?.addEventListener('click', route);
  }
  async function route() {
    if (!state.token) return;
    const parts = location.hash.replace(/^#/, '').split('/');
    const page = parts[0] === 'journey' ? 'users' : titles[parts[0]] ? parts[0] : 'overview';
    document.querySelectorAll('.side-nav a').forEach(link => link.classList.toggle('active', link.dataset.page === page));
    $('#page-title').textContent = tr(titles[page]);
    if (parts[0] === 'journey' && parts[1]) {
      $('#page-title').textContent = tr('journeyTitle');
      await renderJourney(decodeURIComponent(parts[1]));
      return;
    }
    if (page === 'overview') {
      loading();
      try { state.overview = await api('overview'); renderOverview(state.overview); } catch (error) { renderError(error); }
    } else if (page === 'users') await renderUsers(1, '');
    else if (page === 'assessments') await renderAssessments(1);
    else if (page === 'courses') await renderCourses();
    else await renderAnalytics();
  }
  async function initialize() {
    accessState.hidden = false;
    accessState.innerHTML = `<span class="spinner"></span><p>${esc(tr('checkingAccess'))}</p>`;
    try {
      const session = await getSession();
      if (!session?.access_token) { setAccessError(401); return; }
      state.token = session.access_token;
      await api('overview'); // The backend, not the client session, decides admin access.
      state.identity = session.user?.email || '';
      if (state.identity) { $('#admin-identity').textContent = state.identity; $('#admin-identity').hidden = false; }
      document.querySelectorAll('.admin-logout').forEach(button => { button.hidden = false; });
      accessState.hidden = true; appContent.hidden = false;
      observeSession();
      if (!location.hash) location.hash = '#overview';
      await route();
    } catch (error) { setAccessError(error.status || 401); }
  }
  $('#menu-toggle').addEventListener('click', () => {
    const shell = $('.admin-shell');
    const open = shell.classList.toggle('nav-open');
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
  });
  $('#scrim').addEventListener('click', () => { $('.admin-shell').classList.remove('nav-open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); });
  $('#side-nav').addEventListener('click', event => {
    if (event.target.closest('a')) { $('.admin-shell').classList.remove('nav-open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); }
  });
  window.addEventListener('hashchange', route);
  document.addEventListener('careerpath:language-change', async () => { await loadLocale(); if (!appContent.hidden) await route(); });
  loadLocale().then(initialize);
})();
