const express = require('express');
const { publicAvatarUrl } = require('./profile-api');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE_MAX = 100;
const PAGE_MAX = 100000;
const SCAN_MAX = 10000;
const SCAN_PAGE_SIZE = 500;
const DIMENSIONS = [
  'Software Engineering',
  'Data & Analytical Thinking',
  'AI & Computational Intelligence',
  'Systems & Infrastructure',
  'Security & Reliability',
  'Product & User Orientation',
  'Design & Human Experience',
  'Leadership & Delivery'
];

class ApiError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function parsePagination(query = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const requested = query.perPage === undefined ? 25 : Number(query.perPage);
  if (!Number.isInteger(page) || page < 1 || page > PAGE_MAX ||
      !Number.isInteger(requested) || requested < 1) {
    throw new ApiError(400, 'Invalid pagination parameters');
  }
  return { page, perPage: Math.min(requested, PAGE_SIZE_MAX) };
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function safeTopCareers(value) {
  const parsed = parseJson(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap(item => {
    const career = typeof item === 'string' ? item : item?.career;
    if (typeof career !== 'string') return [];
    const score = typeof item === 'object' && Number.isFinite(Number(item.score)) ? Number(item.score) : null;
    return [{ career, score }];
  });
}

function safeAssessment(row, attemptNumber) {
  const scoreData = parseJson(row.score_data, {}) || {};
  const originalDimensions = parseJson(scoreData.dimension_scores, {}) || {};
  const dimensionScores = Object.fromEntries(DIMENSIONS
    .filter(name => Number.isFinite(Number(originalDimensions[name])))
    .map(name => [name, Number(originalDimensions[name])]));
  return {
    attemptId: row.id,
    attemptNumber,
    isRetest: attemptNumber > 1,
    completedAt: row.created_at,
    assessmentVersion: typeof scoreData.assessment_version === 'string' ? scoreData.assessment_version : null,
    topCareers: safeTopCareers(row.top_careers),
    dimensionScores,
    strengths: Array.isArray(scoreData.strengths) ? scoreData.strengths.filter(value => typeof value === 'string') : []
  };
}

function failQuery(error) {
  if (error) {
    const safe = new Error('Admin data query failed');
    safe.cause = error;
    throw safe;
  }
}

async function readCappedRows(makeQuery, cap = SCAN_MAX) {
  const rows = [];
  for (let offset = 0; offset <= cap; offset += SCAN_PAGE_SIZE) {
    const end = Math.min(offset + SCAN_PAGE_SIZE, cap + 1) - 1;
    const { data, error } = await makeQuery().range(offset, end);
    failQuery(error);
    const batch = data || [];
    rows.push(...batch);
    if (rows.length > cap) throw new ApiError(413, 'Result set exceeds the supported limit');
    if (batch.length < end - offset + 1) return rows;
  }
  return rows;
}

async function getAuthUser(supabase, userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw new Error('Auth user lookup failed');
  return data?.user || null;
}

async function getAuthUsers(supabase, userIds) {
  const uniqueIds = [...new Set(userIds)];
  const users = await Promise.all(uniqueIds.map(id => getAuthUser(supabase, id)));
  return new Map(users.filter(Boolean).map(user => [user.id, user]));
}

async function getProfiles(supabase, userIds) {
  if (!userIds.length) return new Map();
  const { data, error } = await supabase.from('users')
    .select('id, full_name, career_goal, avatar_path, bio, created_at')
    .in('id', userIds);
  failQuery(error);
  return new Map((data || []).map(row => [row.id, row]));
}

function accountSummary(supabase, authUser, profile) {
  return {
    id: authUser.id,
    fullName: profile?.full_name || authUser.user_metadata?.full_name || null,
    email: authUser.email || null,
    careerGoal: profile?.career_goal || 'undecided',
    bio: profile?.bio || '',
    avatarUrl: publicAvatarUrl(supabase, profile?.avatar_path),
    joinedAt: authUser.created_at || profile?.created_at || null,
    lastSignInAt: authUser.last_sign_in_at || null
  };
}

async function userSummaryCounts(supabase, userIds) {
  const result = new Map(userIds.map(id => [id, {
    assessmentCount: 0,
    retestCount: 0,
    courseCount: 0,
    certificateCount: 0
  }]));
  if (!userIds.length) return result;
  const [attempts, enrollments, certificates] = await Promise.all([
    readCappedRows(() => supabase.from('career_test_attempts').select('user_id, completed')
      .in('user_id', userIds).eq('completed', true)),
    readCappedRows(() => supabase.from('enrollments').select('user_id').in('user_id', userIds)),
    readCappedRows(() => supabase.from('certificates').select('user_id').in('user_id', userIds))
  ]);
  for (const row of attempts) result.get(row.user_id).assessmentCount++;
  for (const item of result.values()) item.retestCount = Math.max(0, item.assessmentCount - 1);
  for (const row of enrollments) result.get(row.user_id).courseCount++;
  for (const row of certificates) result.get(row.user_id).certificateCount++;
  return result;
}

async function deriveCourseProgress(supabase, enrollments) {
  if (!enrollments.length) return [];
  const courseIds = [...new Set(enrollments.map(row => row.course_id).filter(Boolean))];
  const { data: modules, error: moduleError } = await supabase.from('modules')
    .select('id, course_id, module_order').in('course_id', courseIds);
  failQuery(moduleError);
  const moduleRows = modules || [];
  const moduleCourse = new Map(moduleRows.map(row => [row.id, row.course_id]));
  const moduleOrder = new Map(moduleRows.map(row => [row.id, Number(row.module_order) || 0]));
  const moduleIds = moduleRows.map(row => row.id);
  const lessonRows = moduleIds.length
    ? await readCappedRows(() => supabase.from('lessons')
      .select('id, module_id, title, lesson_order').in('module_id', moduleIds))
    : [];
  const lessonsByCourse = new Map(courseIds.map(id => [id, []]));
  for (const lesson of lessonRows) {
    const courseId = moduleCourse.get(lesson.module_id);
    if (courseId) lessonsByCourse.get(courseId).push(lesson);
  }
  for (const items of lessonsByCourse.values()) {
    items.sort((a, b) => moduleOrder.get(a.module_id) - moduleOrder.get(b.module_id) ||
      (Number(a.lesson_order) || 0) - (Number(b.lesson_order) || 0));
  }
  const lessonIds = lessonRows.map(row => row.id);
  const userIds = [...new Set(enrollments.map(row => row.user_id))];
  const progressRows = lessonIds.length
    ? await readCappedRows(() => supabase.from('lesson_progress')
      .select('user_id, lesson_id, completed').in('user_id', userIds)
      .in('lesson_id', lessonIds).eq('completed', true))
    : [];
  const completedByUser = new Map();
  for (const row of progressRows) {
    if (!completedByUser.has(row.user_id)) completedByUser.set(row.user_id, new Set());
    completedByUser.get(row.user_id).add(row.lesson_id);
  }

  return enrollments.map(enrollment => {
    const lessons = lessonsByCourse.get(enrollment.course_id) || [];
    const done = completedByUser.get(enrollment.user_id) || new Set();
    const completed = lessons.filter(lesson => done.has(lesson.id)).length;
    const total = lessons.length;
    const next = lessons.find(lesson => !done.has(lesson.id));
    return {
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      courseName: enrollment.course_name,
      enrolledAt: enrollment.enrolled_at,
      progressPercent: total ? Math.round(completed / total * 100) : 0,
      lessonsCompleted: completed,
      totalLessons: total,
      nextLesson: next ? { lessonId: next.id, title: next.title, label: 'Next incomplete lesson' } : null,
      completed: total > 0 && completed === total
    };
  });
}

async function loadUserJourney(supabase, userId) {
  const authUser = await getAuthUser(supabase, userId);
  if (!authUser) return null;
  const profiles = await getProfiles(supabase, [userId]);
  const profile = profiles.get(userId) || null;

  const { data: rawAssessments, error: assessmentError } = await supabase.from('career_test_attempts')
    .select('id, top_careers, score_data, completed, created_at')
    .eq('user_id', userId).eq('completed', true)
    .order('created_at', { ascending: true }).limit(1001);
  failQuery(assessmentError);
  if ((rawAssessments || []).length > 1000) throw new ApiError(413, 'Assessment history exceeds the supported limit');
  const assessments = (rawAssessments || []).map((row, index) => safeAssessment(row, index + 1));

  const { data: rawEnrollments, error: enrollmentError } = await supabase.from('enrollments')
    .select('id, user_id, course_id, course_name, enrolled_at')
    .eq('user_id', userId).order('enrolled_at', { ascending: false }).limit(501);
  failQuery(enrollmentError);
  if ((rawEnrollments || []).length > 500) throw new ApiError(413, 'Enrollment history exceeds the supported limit');
  const courses = await deriveCourseProgress(supabase, rawEnrollments || []);

  const { data: rawAttempts, error: examAttemptError } = await supabase.from('exam_attempts')
    .select('id, exam_id, attempt_number, score, passed, started_at, submitted_at')
    .eq('user_id', userId).order('started_at', { ascending: false }).limit(1001);
  failQuery(examAttemptError);
  if ((rawAttempts || []).length > 1000) throw new ApiError(413, 'Exam history exceeds the supported limit');
  const examIds = [...new Set((rawAttempts || []).map(row => row.exam_id))];
  const examsById = new Map();
  if (examIds.length) {
    const { data: exams, error } = await supabase.from('exams').select('id, course_id, title').in('id', examIds);
    failQuery(error);
    for (const exam of exams || []) examsById.set(exam.id, exam);
  }
  const exams = (rawAttempts || []).map(row => {
    const exam = examsById.get(row.exam_id);
    return {
      examId: row.exam_id,
      courseId: exam?.course_id || null,
      title: exam?.title || null,
      attemptNumber: row.attempt_number,
      score: Number.isFinite(Number(row.score)) ? Number(row.score) : null,
      passed: typeof row.passed === 'boolean' ? row.passed : null,
      startedAt: row.started_at,
      submittedAt: row.submitted_at
    };
  });

  const { data: rawCertificates, error: certificateError } = await supabase.from('certificates')
    .select('id, course_id, course_name, earned_at').eq('user_id', userId)
    .order('earned_at', { ascending: false }).limit(1001);
  failQuery(certificateError);
  if ((rawCertificates || []).length > 1000) throw new ApiError(413, 'Certificate history exceeds the supported limit');
  const certificates = (rawCertificates || []).map(row => ({
    certificateId: row.id,
    courseId: row.course_id,
    courseName: row.course_name,
    earnedAt: row.earned_at
  }));

  return {
    account: accountSummary(supabase, authUser, profile),
    assessments,
    careerProfile: assessments.length ? assessments[assessments.length - 1] : null,
    courses,
    exams,
    certificates
  };
}

function safeDate(value, field) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new ApiError(400, `Invalid ${field}`);
  return new Date(value).toISOString();
}

async function exactCount(supabase, table, configure = query => query) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  query = configure(query);
  const { count, error } = await query;
  failQuery(error);
  return count || 0;
}

async function countAuthUsers(supabase) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error('Auth user count query failed');
  return Number.isFinite(Number(data?.total)) ? Number(data.total) : (data?.users || []).length;
}

function safeQueryError(res, error) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.publicMessage });
  return res.status(500).json({ error: 'Admin request failed' });
}

function createAdminRouter({ supabase, authenticateToken }) {
  const router = express.Router();

  async function requireAdmin(req, res, next) {
    if (!req.user?.id || !UUID_RE.test(req.user.id)) return res.status(401).json({ error: 'Authentication required' });
    try {
      const { data, error } = await supabase.from('admin_users').select('user_id')
        .eq('user_id', req.user.id).maybeSingle();
      if (error) return res.status(503).json({ error: 'Admin authorization is unavailable' });
      if (!data) return res.status(403).json({ error: 'Administrator access required' });
      return next();
    } catch {
      return res.status(503).json({ error: 'Admin authorization is unavailable' });
    }
  }

  router.use(authenticateToken, requireAdmin);

  router.get('/overview', async (_req, res) => {
    try {
      const [totalUsers, completedAssessmentAttempts, coursesStarted, lessonsCompleted,
        examsAttempted, examsPassed, certificatesIssued, completedAttemptRows] = await Promise.all([
        countAuthUsers(supabase),
        exactCount(supabase, 'career_test_attempts', q => q.eq('completed', true)),
        exactCount(supabase, 'enrollments'),
        exactCount(supabase, 'lesson_progress', q => q.eq('completed', true)),
        exactCount(supabase, 'exam_attempts'),
        exactCount(supabase, 'exam_attempts', q => q.eq('passed', true)),
        exactCount(supabase, 'certificates'),
        readCappedRows(() => supabase.from('career_test_attempts').select('user_id')
          .eq('completed', true))
      ]);
      const assessmentUsers = new Set(completedAttemptRows.map(row => row.user_id)).size;
      return res.json({
        totalUsers,
        completedAssessmentAttempts,
        usersWithCompletedAssessment: assessmentUsers,
        coursesStarted,
        lessonsCompleted,
        examsAttempted,
        examsPassed,
        certificatesIssued,
        definitions: {
          completedAssessmentAttempts: 'attempt count',
          usersWithCompletedAssessment: 'distinct authenticated users',
          coursesStarted: 'enrollment record count',
          lessonsCompleted: 'completed lesson_progress record count',
          assessmentCompletionRate: 'not available; assessment starts are not persisted'
        }
      });
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/users', async (req, res) => {
    try {
      const { page, perPage } = parsePagination(req.query);
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      let authUsers = [];
      let profiles = new Map();
      let total = 0;

      if (q && UUID_RE.test(q)) {
        const authUser = await getAuthUser(supabase, q);
        authUsers = authUser ? [authUser] : [];
        profiles = await getProfiles(supabase, authUsers.map(user => user.id));
        total = authUsers.length;
      } else if (q) {
        const term = q.replace(/[^\p{L}\p{N} .'-]/gu, '').trim();
        if (term.length < 2 || term.length > 80) throw new ApiError(400, 'Name search must be 2 to 80 characters');
        const { data, count, error } = await supabase.from('users')
          .select('id, full_name, career_goal, avatar_path, bio, created_at', { count: 'exact' })
          .ilike('full_name', `%${term}%`)
          .order('full_name', { ascending: true })
          .range((page - 1) * perPage, page * perPage - 1);
        failQuery(error);
        const profileRows = data || [];
        profiles = new Map(profileRows.map(row => [row.id, row]));
        authUsers = (await getAuthUsers(supabase, profileRows.map(row => row.id))).values();
        authUsers = [...authUsers];
        total = count || 0;
      } else {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error('Auth user list query failed');
        authUsers = data?.users || [];
        total = Number(data?.total) || authUsers.length;
        profiles = await getProfiles(supabase, authUsers.map(user => user.id));
      }

      const summaries = await userSummaryCounts(supabase, authUsers.map(user => user.id));
      const users = authUsers.map(user => ({
        ...accountSummary(supabase, user, profiles.get(user.id)),
        ...(summaries.get(user.id) || { assessmentCount: 0, retestCount: 0, courseCount: 0, certificateCount: 0 })
      }));
      return res.json({ users, page, perPage, total, searchFields: ['name', 'userId'] });
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/users/:id', async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid user ID' });
    try {
      const journey = await loadUserJourney(supabase, req.params.id);
      if (!journey) return res.status(404).json({ error: 'User not found' });
      return res.json(journey);
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/assessments', async (req, res) => {
    try {
      const { page, perPage } = parsePagination(req.query);
      if (req.query.userId !== undefined && !UUID_RE.test(String(req.query.userId))) {
        throw new ApiError(400, 'Invalid userId');
      }
      const from = safeDate(req.query.from, 'from');
      const to = safeDate(req.query.to, 'to');
      if (from && to && from > to) throw new ApiError(400, 'from must not be after to');
      let query = supabase.from('career_test_attempts')
        .select('id, user_id, top_careers, score_data, completed, created_at', { count: 'exact' });
      if (req.query.userId) query = query.eq('user_id', req.query.userId);
      if (req.query.completed !== undefined) {
        if (!['true', 'false'].includes(String(req.query.completed))) throw new ApiError(400, 'Invalid completed filter');
        query = query.eq('completed', String(req.query.completed) === 'true');
      }
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);
      if (req.query.version !== undefined) {
        const version = String(req.query.version);
        if (!/^[a-zA-Z0-9._-]{1,80}$/.test(version)) throw new ApiError(400, 'Invalid version filter');
        query = query.filter('score_data->>assessment_version', 'eq', version);
      }
      const { data, count, error } = await query.order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);
      failQuery(error);
      const attempts = (data || []).map(row => ({
        attemptId: row.id,
        userId: row.user_id,
        completedAt: row.created_at,
        assessmentVersion: parseJson(row.score_data, {})?.assessment_version || null,
        topCareers: safeTopCareers(row.top_careers),
        dimensionScores: safeAssessment(row, 1).dimensionScores,
        strengths: safeAssessment(row, 1).strengths,
        completed: Boolean(row.completed)
      }));
      return res.json({ attempts, page, perPage, total: count || 0 });
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/progress', async (req, res) => {
    try {
      const { page, perPage } = parsePagination(req.query);
      if (req.query.userId !== undefined && !UUID_RE.test(String(req.query.userId))) throw new ApiError(400, 'Invalid userId');
      const courseId = req.query.courseId;
      if (courseId !== undefined && (typeof courseId !== 'string' || courseId.length > 120)) throw new ApiError(400, 'Invalid courseId');
      let query = supabase.from('enrollments')
        .select('id, user_id, course_id, course_name, enrolled_at', { count: 'exact' });
      if (req.query.userId) query = query.eq('user_id', req.query.userId);
      if (courseId) query = query.eq('course_id', courseId);
      const { data, count, error } = await query.order('enrolled_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);
      failQuery(error);
      const progress = await deriveCourseProgress(supabase, data || []);
      return res.json({ progress, page, perPage, total: count || 0 });
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/exams', async (req, res) => {
    try {
      const { page, perPage } = parsePagination(req.query);
      if (req.query.userId !== undefined && !UUID_RE.test(String(req.query.userId))) throw new ApiError(400, 'Invalid userId');
      if (req.query.examId !== undefined && (typeof req.query.examId !== 'string' || req.query.examId.length > 120)) throw new ApiError(400, 'Invalid examId');
      let examIds = null;
      if (req.query.courseId !== undefined) {
        const courseId = String(req.query.courseId);
        if (!courseId || courseId.length > 120) throw new ApiError(400, 'Invalid courseId');
        const matching = await readCappedRows(() => supabase.from('exams')
          .select('id').eq('course_id', courseId));
        examIds = matching.map(row => row.id);
        if (!examIds.length) return res.json({ attempts: [], page, perPage, total: 0 });
      }
      let query = supabase.from('exam_attempts')
        .select('id, user_id, exam_id, attempt_number, score, passed, started_at, submitted_at', { count: 'exact' });
      if (req.query.userId) query = query.eq('user_id', req.query.userId);
      if (req.query.examId) query = query.eq('exam_id', req.query.examId);
      if (examIds) query = query.in('exam_id', examIds);
      if (req.query.passed !== undefined) {
        if (!['true', 'false'].includes(String(req.query.passed))) throw new ApiError(400, 'Invalid passed filter');
        query = query.eq('passed', String(req.query.passed) === 'true');
      }
      const { data, count, error } = await query.order('started_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);
      failQuery(error);
      const examIdsOnPage = [...new Set((data || []).map(row => row.exam_id))];
      const examsById = new Map();
      if (examIdsOnPage.length) {
        const { data: exams, error: examError } = await supabase.from('exams')
          .select('id, course_id, title').in('id', examIdsOnPage);
        failQuery(examError);
        for (const exam of exams || []) examsById.set(exam.id, exam);
      }
      const attempts = (data || []).map(row => ({
        examId: row.exam_id,
        courseId: examsById.get(row.exam_id)?.course_id || null,
        title: examsById.get(row.exam_id)?.title || null,
        attemptNumber: row.attempt_number,
        score: Number.isFinite(Number(row.score)) ? Number(row.score) : null,
        passed: typeof row.passed === 'boolean' ? row.passed : null,
        startedAt: row.started_at,
        submittedAt: row.submitted_at
      }));
      return res.json({ attempts, page, perPage, total: count || 0 });
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/certificates', async (req, res) => {
    try {
      const { page, perPage } = parsePagination(req.query);
      if (req.query.userId !== undefined && !UUID_RE.test(String(req.query.userId))) throw new ApiError(400, 'Invalid userId');
      if (req.query.courseId !== undefined && (typeof req.query.courseId !== 'string' || req.query.courseId.length > 120)) throw new ApiError(400, 'Invalid courseId');
      const from = safeDate(req.query.from, 'from');
      const to = safeDate(req.query.to, 'to');
      let query = supabase.from('certificates')
        .select('id, user_id, course_id, course_name, earned_at', { count: 'exact' });
      if (req.query.userId) query = query.eq('user_id', req.query.userId);
      if (req.query.courseId) query = query.eq('course_id', req.query.courseId);
      if (from) query = query.gte('earned_at', from);
      if (to) query = query.lte('earned_at', to);
      const { data, count, error } = await query.order('earned_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);
      failQuery(error);
      const userIds = [...new Set((data || []).map(row => row.user_id))];
      const [authUsers, profiles] = await Promise.all([getAuthUsers(supabase, userIds), getProfiles(supabase, userIds)]);
      const certificates = (data || []).map(row => ({
        certificateId: row.id,
        user: authUsers.has(row.user_id) ? accountSummary(supabase, authUsers.get(row.user_id), profiles.get(row.user_id)) : { id: row.user_id },
        courseId: row.course_id,
        courseName: row.course_name,
        earnedAt: row.earned_at
      }));
      return res.json({ certificates, page, perPage, total: count || 0 });
    } catch (error) { return safeQueryError(res, error); }
  });

  router.get('/analytics', async (_req, res) => {
    try {
      const [attemptRows, enrollments, courses, completedLessons, examAttempts, examPasses, certificates] = await Promise.all([
        readCappedRows(() => supabase.from('career_test_attempts').select('user_id, top_careers').eq('completed', true)),
        readCappedRows(() => supabase.from('enrollments').select('user_id, course_id, course_name')),
        readCappedRows(() => supabase.from('courses').select('id, title')),
        exactCount(supabase, 'lesson_progress', q => q.eq('completed', true)),
        exactCount(supabase, 'exam_attempts'),
        exactCount(supabase, 'exam_attempts', q => q.eq('passed', true)),
        readCappedRows(() => supabase.from('certificates').select('course_id'))
      ]);
      const careerCounts = new Map();
      for (const attempt of attemptRows) {
        const career = safeTopCareers(attempt.top_careers)[0]?.career;
        if (career) careerCounts.set(career, (careerCounts.get(career) || 0) + 1);
      }
      const enrollmentCounts = new Map();
      for (const enrollment of enrollments) enrollmentCounts.set(enrollment.course_id,
        (enrollmentCounts.get(enrollment.course_id) || 0) + 1);
      const completedCourseRows = await deriveCourseProgress(supabase,
        enrollments.map((row, index) => ({ ...row, id: `aggregate-${index}`, enrolled_at: null })));
      const completionCounts = new Map();
      for (const enrollment of completedCourseRows) if (enrollment.completed) {
        completionCounts.set(enrollment.courseId, (completionCounts.get(enrollment.courseId) || 0) + 1);
      }
      const certificateCounts = new Map();
      for (const certificate of certificates) certificateCounts.set(certificate.course_id,
        (certificateCounts.get(certificate.course_id) || 0) + 1);
      return res.json({
        careerDirectionDistribution: [...careerCounts].map(([career, attempts]) => ({ career, attempts })),
        courses: courses.map(course => ({
          courseId: course.id,
          courseName: course.title,
          enrollments: enrollmentCounts.get(course.id) || 0,
          completedEnrollments: completionCounts.get(course.id) || 0,
          certificatesIssued: certificateCounts.get(course.id) || 0
        })),
        lessonsCompleted: completedLessons,
        examAttempts,
        examsPassed: examPasses,
        examPassRate: examAttempts ? Number((examPasses / examAttempts * 100).toFixed(2)) : null,
        completedAssessmentAttempts: attemptRows.length,
        usersWithCompletedAssessment: new Set(attemptRows.map(row => row.user_id)).size,
        notes: {
          careerDistributionUnit: 'top career per completed attempt',
          courseCompletion: 'derived from all required lessons completed',
          activityMetrics: 'not available; reliable activity events are not persisted',
          assessmentCompletionRate: 'not available; assessment starts are not persisted',
          aggregationLimit: SCAN_MAX
        }
      });
    } catch (error) { return safeQueryError(res, error); }
  });

  return router;
}

module.exports = {
  createAdminRouter,
  loadUserJourney,
  parsePagination,
  safeAssessment,
  safeTopCareers
};
