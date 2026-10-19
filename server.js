// CUSTOM IDENTIFIER TO VERIFY WHICH FILE IS LOADING - SUPABASE ONLY IMPLEMENTATION
console.log('SERVER STARTING - LOADED SERVER.JS (SUPABASE ONLY)');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const { randomInt } = require('crypto');
const courseCatalogConfig = require('./course-catalog-config.json');
const { createAdminRouter } = require('./admin-api');
const { createProfileRouter, publicAvatarUrl } = require('./profile-api');
const { fetchLatestCareerAttempt } = require('./career-assessment-store');
const { createProgrammingExecutionRouter } = require('./programming-execution-api');
const { createNotificationRouter, createNotification } = require('./notification-api');
const { createProgressRouter } = require('./progress-api');
const { createAuthRouter, getCareerTestCompleted } = require('./auth-api');
const { createCertificateRouter } = require('./certificate-api');
const { createChatRouter } = require('./chat-api');
const { persistLessonCompletion } = require('./lesson-progress-store');
const { createCourseLearningStore } = require('./course-learning-store');
const { createCourseEnrollmentRouter, formatEnrollment } = require('./course-enrollment-api');
const { createLessonProgressRouter } = require('./lesson-progress-api');

// Load environment variables
dotenv.config();

// Fail fast with a clear message instead of crashing later inside clients.
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json());
app.use(express.static("public"));

// Keep the short product routes available while the browser-side shared auth
// helper enforces the existing Supabase session for learning pages.
app.get('/courses', (_req, res) => res.sendFile(require('path').join(__dirname, 'public', 'courses.html')));
app.get('/programming', (_req, res) => res.sendFile(require('path').join(__dirname, 'public', 'programming.html')));

// Supabase setup (using service role key for backend operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const courseLearningStore = createCourseLearningStore(supabase);

// Keep Auth API state separate from the service-role database client. Supabase
// auth methods maintain a current session in their client; that must never
// replace the service-role Authorization used for database reads and writes.
function createAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getAuthCallbackUrl() {
  const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const appOrigin = new URL(appUrl).origin;
  return `${appOrigin}/auth-callback.html`;
}

// Gemini AI setup
// Create the Gemini client lazily after checking server-side configuration.
let genAIClient = null;
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const error = new Error('AI assistant is not configured');
    error.status = 503;
    throw error;
  }
  if (!genAIClient) genAIClient = new GoogleGenAI({ apiKey });
  return genAIClient;
}

// ---- Shared helpers -------------------------------------------------------
// The database is authoritative and uses snake_case columns. The frontend
// expects camelCase in several places, so mapping happens here, not in the DB.

// modules.id and lessons.id are uuid columns. Passing a malformed id straight
// through to Postgres makes it fail with 22P02, which surfaced as a 500 for
// what is really a bad client request. Guard the shape first and answer 400.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

// jsonb columns normally arrive already parsed, but some legacy rows in
// career_test stored JSON as a string. Accept both.
function parseJsonField(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }
  return value;
}

// career_test.top_careers exists in two shapes: [{ career, score }] and ["career"].
function normalizeTopCareers(value) {
  const parsed = parseJsonField(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(item => {
      if (item && typeof item === 'object') {
        return { career: item.career, score: item.score === undefined ? null : item.score };
      }
      return { career: item, score: null };
    })
    .filter(item => item.career);
}

const { CAREER_ASSESSMENT_DIMENSIONS, calculateCareerAssessmentV1 } = require('./career-assessment');

// Map an enrollments row (snake_case) to the camelCase shape the frontend uses.
// Latest career assessment for a user.
// ONLY career_test_attempts is treated as the current assessment. The legacy
// career_test table is retained as historical data but is NOT surfaced as the
// user's current result (it holds pre-CS-assessment results).
async function getLatestCareerAssessment(userId, completedOnly = false) {
  const attempt = await fetchLatestCareerAttempt(supabase, userId, completedOnly);
  if (!attempt) return null;

  // strengths live inside score_data (career_test_attempts has no strengths column)
  const scoreData = parseJsonField(attempt.score_data, {}) || {};

  return {
    attemptId: attempt.id,
    completed: Boolean(attempt.completed),
    topCareers: normalizeTopCareers(attempt.top_careers),
    strengths: Array.isArray(scoreData.strengths) ? scoreData.strengths : [],
    assessmentVersion: scoreData.assessment_version || null,
    dimensionScores: scoreData.dimension_scores || null,
    completedAt: attempt.created_at
  };
}

// Has the user completed a career assessment? Used by the auth callback flow.
async function hasCompletedCareerTest(userId) {
  const assessment = await getLatestCareerAssessment(userId);
  return Boolean(assessment && assessment.completed);
}

// Authentication middleware - verify Supabase JWT and fetch user metadata
async function authenticateToken(req, res, next, { skipProfileLookup = false } = {}) {
  const [scheme, token] = (req.headers.authorization || '').split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let authResult;
  try {
    authResult = await createAuthClient().auth.getUser(token);
  } catch (error) {
    console.error('Authentication provider unavailable:', error?.status || 'network error');
    return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
  }

  if (authResult.error) {
    const status = Number(authResult.error.status);
    if (status >= 500 || status === 429 || !status) {
      console.error('Authentication provider error:', status || 'unknown status');
      return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = authResult.data?.user;
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });

  const nameFromAuth = user.user_metadata?.full_name || user.email?.split('@')[0] || user.phone || 'User';
  if (skipProfileLookup) {
    req.user = {
      id: user.id,
      email: user.email || null,
      name: nameFromAuth,
      careerGoal: user.user_metadata?.career_goal || 'undecided'
    };
    return next();
  }

  let profileResult;
  try {
    profileResult = await supabase
      .from('users')
      .select('full_name, career_goal')
      .eq('id', user.id)
      .maybeSingle();
  } catch (error) {
    console.error('User profile lookup failed:', error?.code || 'database error');
    return res.status(503).json({ error: 'User profile is temporarily unavailable' });
  }

  if (profileResult.error) {
    console.error('User profile lookup failed:', profileResult.error.code || 'database error');
    return res.status(503).json({ error: 'User profile is temporarily unavailable' });
  }

  req.user = {
    id: user.id,
    email: user.email || null,
    name: profileResult.data?.full_name || nameFromAuth,
    careerGoal: profileResult.data?.career_goal || user.user_metadata?.career_goal || 'undecided'
  };
  return next();
}

// Every admin endpoint is protected by bearer authentication and a separate
// server-side admin_users membership check before it performs admin queries.
app.use('/api/admin', createAdminRouter({
  supabase,
  authenticateToken: (req, res, next) => authenticateToken(req, res, next, { skipProfileLookup: true })
}));
app.use('/api/profile', createProfileRouter({ supabase, authenticateToken }));
// Programming Studio: secure code execution. Runs only through a configured
// external sandbox provider; never executes code inside this process.
app.use('/api/programming', createProgrammingExecutionRouter({ authenticateToken }));
app.use('/api/notifications', createNotificationRouter({ supabase, authenticateToken }));
app.use('/api', createCourseEnrollmentRouter({ supabase, authenticateToken }));

// Initialize database tables (Supabase handles this, but we'll keep the function for compatibility)
function initializeDatabase() {
  console.log('Supabase connected - tables should exist via dashboard');
  // In a real migration, you might run SQL migrations here
  // But for now, we assume tables are set up in Supabase dashboard
}

// Health check endpoint (booleans only; never exposes values or secrets)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      programmingExecution: Boolean(process.env.PROGRAMMING_EXECUTION_PROVIDER && process.env.PISTON_BASE_URL)
    }
  });
});

// Get all questions for the career test
app.get('/api/questions', authenticateToken, async (_req, res) => {
  try {
    // Serve only the active question bank. The 48 inactive rows are the retired
    // pre-"cs-career-v2" bank: 4 options each, with non-numeric option_value
    // ("essential"/"important"/"moderate"). career-test.js draws its
    // cross-dimensional question from whatever this returns, so leaving them in
    // meant ~34% of attempts showed a 4-choice question whose value parses to NaN.
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        category,
        question_options (
          id,
          option_text,
          option_value
        )
      `)
      .eq('active', true);

    if (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Format questions for frontend
    const formattedQuestions = data.map(q => ({
      id: q.id,
      text: q.question_text,
      category: q.category,
      options: [...(q.question_options || [])]
        .sort((a, b) => Number(a.option_value) - Number(b.option_value))
        .map(opt => ({
          value: opt.option_value,
          text: opt.option_text
        }))
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Error in /api/questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Registration endpoints live in auth-api.js (honest profile completion).
app.use('/api', createAuthRouter({ supabase, authenticateToken, createAuthClient, getAuthCallbackUrl }));
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const authClient = createAuthClient();

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      const message = String(error.message || '');
      if (/email not confirmed|not confirmed|confirm/i.test(message)) {
        return res.status(400).json({ error: 'Email not confirmed. Check your email to confirm your account before signing in.' });
      }
      if (/rate limit|too many requests/.test(message.toLowerCase())) {
        return res.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
      }
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { user, session } = data;

    // Fetch user metadata from our public.users table
    const { data: userMetadata, error: metadataError } = await supabase
      .from('users')
      .select('full_name, career_goal')
      .eq('id', user.id)
      .maybeSingle();

    if (metadataError) {
      console.error('Error fetching user metadata:', metadataError.code || 'database error');
      return res.status(503).json({ error: 'User profile is temporarily unavailable' });
    }

    // login.js routes on data.user.careerTestCompleted (dashboard when the
    // assessment is done, career test otherwise). Reuse the same check as
    // GET /api/auth/me. A lookup failure must not break login and must not
    // masquerade as "not completed": it resolves to null (unknown), which
    // login.js treats like false AND career-test.js itself reloads any saved
    // completed result, so a returning user is never trapped or misrouted.
    let careerTestCompleted = null;
    try {
      careerTestCompleted = await getCareerTestCompleted(supabase, user.id);
    } catch (assessmentError) {
      console.error('Error checking career test completion on login:', assessmentError?.code || 'database error');
    }

    res.json({
      token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: userMetadata?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || user.phone || 'User',
        careerGoal: userMetadata?.career_goal || user.user_metadata?.career_goal || 'undecided',
        careerTestCompleted
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // public.users has NO email column - email comes from the authenticated Supabase user.
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, full_name, career_goal, avatar_path, bio, preferred_language, theme_preference, created_at, updated_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching profile:', userError);
      return res.status(500).json({ error: 'Database error' });
    }

    const fullName = (userRow && userRow.full_name) || req.user.name;
    const careerGoal = (userRow && userRow.career_goal) || req.user.careerGoal || 'undecided';
    const careerTestCompleted = await hasCompletedCareerTest(req.user.id);

    // Return a flat profile object (profile.js and auth-callback.js both read it
    // directly). Both snake_case and camelCase keys are provided for compatibility.
    res.json({
      id: req.user.id,
      email: req.user.email,
      full_name: fullName,
      name: fullName,
      career_goal: careerGoal,
      careerGoal: careerGoal,
      avatar_path: userRow?.avatar_path || null,
      avatar_url: publicAvatarUrl(supabase, userRow?.avatar_path),
      bio: userRow?.bio || '',
      preferred_language: userRow?.preferred_language || null,
      theme_preference: userRow?.theme_preference || null,
      created_at: userRow?.created_at || null,
      updated_at: userRow?.updated_at || null,
      careerTestCompleted
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth endpoint
// Note: With Supabase, Google OAuth is typically handled client-side
// This endpoint is kept for compatibility but will guide to client-side approach
app.post('/api/auth/google', async (_req, res) => {
  try {
    res.status(400).json({
      error: 'Google OAuth should be handled client-side using supabase.auth.signInWithOAuth({ provider: "google" })'
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Career test endpoints (keep same logic but use Supabase for DB)
app.post('/api/career-test', authenticateToken, async (req, res) => {
  try {
    const { assessment_version, question_ids, answers, completed } = req.body || {};
    const userId = req.user.id;

    if (assessment_version !== 'career-profile-v1') {
      return res.status(400).json({ error: 'Unsupported assessment_version' });
    }
    if (!Array.isArray(question_ids) || question_ids.length !== 25) {
      return res.status(400).json({ error: 'Exactly 25 question_ids are required' });
    }
    if (question_ids.some(id => !isUuid(id))) {
      return res.status(400).json({ error: 'Every question ID must be a valid UUID' });
    }
    if (new Set(question_ids).size !== question_ids.length) {
      return res.status(400).json({ error: 'Duplicate question IDs are not allowed' });
    }
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an object keyed by question ID' });
    }
    const answerIds = Object.keys(answers);
    if (answerIds.length !== question_ids.length || question_ids.some(id => !Object.prototype.hasOwnProperty.call(answers, id))) {
      return res.status(400).json({ error: 'A valid answer is required for every submitted question ID' });
    }
    if (question_ids.some(id => !Number.isInteger(answers[id]) || answers[id] < 1 || answers[id] > 5)) {
      return res.status(400).json({ error: 'Answers must be integer Likert values from 1 to 5' });
    }
    if (completed !== true) {
      return res.status(400).json({ error: 'completed must be true when submitting an assessment' });
    }

    const { data: questionRows, error: questionError } = await supabase
      .from('questions')
      .select('id, category, active, question_options(option_value)')
      .in('id', question_ids)
      .eq('active', true);

    if (questionError) {
      console.error('Error validating career assessment questions:', questionError);
      return res.status(500).json({ error: 'Failed to validate submitted questions' });
    }
    if (!questionRows || questionRows.length !== question_ids.length) {
      return res.status(400).json({ error: 'One or more question IDs do not exist in the active assessment' });
    }

    const questionById = new Map(questionRows.map(question => [question.id, question]));
    if (question_ids.some(id => {
      const allowedValues = new Set((questionById.get(id).question_options || [])
        .map(option => Number(option.option_value)));
      return !allowedValues.has(answers[id]);
    })) {
      return res.status(400).json({ error: 'Each answer must match an available option for its question' });
    }

    const representedDimensions = new Set(questionRows.map(question => question.category));
    if (questionRows.some(question => !CAREER_ASSESSMENT_DIMENSIONS.includes(question.category))) {
      return res.status(400).json({ error: 'Submitted questions include an unsupported assessment dimension' });
    }
    const missingDimensions = CAREER_ASSESSMENT_DIMENSIONS.filter(dimension => !representedDimensions.has(dimension));
    if (missingDimensions.length) {
      return res.status(400).json({
        error: 'Submitted questions must represent every required dimension',
        missing_dimensions: missingDimensions
      });
    }

    const calculated = calculateCareerAssessmentV1(questionRows, answers);

    // career_test_attempts stores assessment metadata/results in score_data JSONB;
    // no schema change is needed for the existing attempt table.
    const { data, error } = await supabase
      .from('career_test_attempts')
      .insert({
        user_id: userId,
        answers: answers,
        top_careers: calculated.topCareers,
        completed: true,
        score_data: {
          assessment_version,
          question_ids,
          dimension_scores: calculated.dimensionScores,
          strengths: calculated.strengths
        }
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error saving career test attempt:', error);
      return res.status(500).json({ error: 'Failed to save career test attempt' });
    }

    // Update user's career goal with the top recommendation in public.users table
    if (calculated.topCareers.length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ career_goal: calculated.topCareers[0].career })
        .eq('id', userId);

      if (updateError) {
        console.warn('Failed to update career goal:', updateError);
        // Don't fail the request for this
      }
    }

    res.json({
      message: 'Career test attempt saved successfully',
      attemptId: data ? data.id : null,
      result: {
        assessment_version,
        dimension_scores: calculated.dimensionScores,
        top_careers: calculated.topCareers,
        strengths: calculated.strengths
      }
    });
  } catch (error) {
    console.error('Career test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET career test - get from Supabase
app.get('/api/career-test', authenticateToken, async (req, res) => {
  try {
    const assessment = await getLatestCareerAssessment(req.user.id, true);
    if (!assessment || !assessment.completed) {
      return res.status(404).json({
        error: 'NO_COMPLETED_CAREER_ASSESSMENT'
      });
    }

    res.json({
      attemptId: assessment.attemptId,
      completed: assessment.completed,
      result: {
        assessment_version: assessment.assessmentVersion,
        dimension_scores: assessment.dimensionScores,
        top_careers: assessment.topCareers,
        strengths: assessment.strengths
      },
      // Preserve the existing camelCase fields for any older consumer.
      topCareers: assessment.topCareers,
      strengths: assessment.strengths
    });
  } catch (error) {
    console.error('Career test retrieval error:', error);
    res.status(500).json({ error: 'CAREER_ASSESSMENT_READ_FAILED' });
  }
});

// Certificates are issued only from server-verified enrollment, lesson, and
// latest final-exam attempt records (see certificate-api.js). The server,
// via its service-role client, is the sole writer to public.certificates.
app.use('/api', createCertificateRouter({ supabase, authenticateToken, createNotification, isUuid }));

// Dashboard endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // public.users has NO email column - email comes from the authenticated Supabase user.
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, career_goal, avatar_path')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Database error' });
    }

    const { data: enrollData, error: enrollError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return res.status(500).json({ error: 'Database error' });
    }

    const { data: certData, error: certError } = await supabase
      .from('certificates')
      .select('id, course_id, course_name, earned_at')
      .eq('user_id', userId);

    if (certError) {
      console.error('Error fetching certificates:', certError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Real activity, if any has been recorded. Never fabricated.
    const { data: activityData, error: activityError } = await supabase
      .from('user_activity')
      .select('activity_type, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) {
      console.error('Error fetching activity:', activityError.code || 'database error');
      return res.status(500).json({ error: 'Could not load dashboard activity' });
    }

    const enrollments = enrollData || [];
    const certificates = certData || [];

    // Career Insights always reflect the newest completed result, even when a
    // later in-progress retake exists.
    const latestAssessment = await getLatestCareerAssessment(userId, true);
    const careerTest = latestAssessment && latestAssessment.completed &&
      latestAssessment.assessmentVersion === 'career-profile-v1' &&
      latestAssessment.dimensionScores
      ? latestAssessment
      : null;

    res.json({
      user: {
        id: userId,
        email: req.user.email,
        name: (userData && userData.full_name) || req.user.name,
        careerGoal: (userData && userData.career_goal) || 'undecided',
        avatarPath: userData?.avatar_path || null,
        avatarUrl: publicAvatarUrl(supabase, userData?.avatar_path)
      },
      stats: {
        coursesEnrolled: enrollments.length,
        overallProgress: enrollments.length > 0 ?
          Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length) : 0,
        // Streak is not tracked by this application. Reported as unavailable
        // rather than invented.
        streak: null,
        certificatesEarned: certificates.length
      },
      careerTest: careerTest && careerTest.completed ? careerTest : null,
      enrollments: enrollments.map(formatEnrollment),
      certificates: certificates.map(certificate => ({
        id: certificate.id,
        course_id: certificate.course_id,
        course_name: certificate.course_name,
        earned_at: certificate.earned_at
      })),
      recentActivity: (activityData || []).map(activity => ({
        type: activity.activity_type,
        description: activity.description,
        timestamp: activity.created_at
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Secure course exam endpoints. All exam table access uses the server's
// service-role client; browser clients have no exam-table RLS policies.
function shuffleExamItems(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function effectiveExamDurationMinutes(exam) {
  // The Intro to AI & ML final includes both MCQs and a crossword; keep its
  // server-enforced total attempt window to 10 minutes for new attempts.
  if (exam?.id === 'intro_to_ai_exam_1') return 10;
  const configured = Number(exam?.duration_minutes);
  return Number.isFinite(configured) && configured > 0 ? configured : 60;
}

function examMetadata(exam, questionCount) {
  return {
    id: exam.id,
    course_id: exam.course_id,
    title: exam.title,
    description: exam.description || '',
    passing_score: exam.passing_score,
    duration_minutes: effectiveExamDurationMinutes(exam),
    max_attempts: exam.max_attempts,
    question_count: questionCount,
    is_final: exam.is_final === true
  };
}

async function loadExamMetadata(examId) {
  const { data: exam, error } = await supabase
    .from('exams')
    .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes')
    .eq('id', examId)
    .maybeSingle();
  if (error) throw error;
  if (!exam) return null;

  const { count, error: countError } = await supabase
    .from('exam_questions')
    .select('id', { count: 'exact', head: true })
    .eq('exam_id', examId);
  if (countError) throw countError;
  return examMetadata(exam, count || 0);
}

async function getOwnedExamAttempt(attemptId, examId, userId) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, user_id, attempt_number, score, passed, started_at, submitted_at, selected_question_ids, option_order, deadline_at, mcq_submitted_at, crossword_submitted_at, result_data')
    .eq('id', attemptId)
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function safeExamResult(attempt) {
  const result = parseJsonField(attempt.result_data, {}) || {};
  return {
    attempt_id: attempt.id,
    exam_id: attempt.exam_id,
    mcq: result.mcq || null,
    crossword: result.crossword || null,
    score: result.final_score ?? attempt.score ?? 0,
    final_score: result.final_score ?? attempt.score ?? 0,
    percentage: result.final_score ?? attempt.score ?? 0,
    passed: Boolean(result.passed ?? attempt.passed),
    passing_score: result.passing_score ?? null,
    total_questions: result.mcq?.total ?? (Array.isArray(attempt.selected_question_ids) ? attempt.selected_question_ids.length : 0),
    answered_questions: result.mcq?.answered ?? 0,
    submitted_at: attempt.submitted_at,
    status: result.status || 'submitted'
  };
}

async function formatExamAttempt(attempt, exam) {
  if (attempt.mcq_submitted_at) return formatCrosswordAttempt(attempt, exam);
  const questionIds = Array.isArray(attempt.selected_question_ids) ? attempt.selected_question_ids : [];
  if (!questionIds.length) throw new Error('Attempt has no question snapshot');

  const { data: questionRows, error: questionError } = await supabase
    .from('exam_questions')
    .select('id, question_text, points')
    .eq('exam_id', exam.id)
    .in('id', questionIds);
  if (questionError) throw questionError;
  const questionById = new Map((questionRows || []).map(question => [question.id, question]));
  if (questionIds.some(id => !questionById.has(id))) throw new Error('Attempt question snapshot is invalid');

  const optionIds = Object.values(attempt.option_order || {}).flat();
  const { data: optionRows, error: optionError } = await supabase
    .from('exam_options')
    .select('id, question_id, option_text')
    .in('id', optionIds);
  if (optionError) throw optionError;
  const optionById = new Map((optionRows || []).map(option => [option.id, option]));

  const { data: answers, error: answerError } = await supabase
    .from('exam_answers')
    .select('question_id, selected_option_id')
    .eq('attempt_id', attempt.id);
  if (answerError) throw answerError;

  const userAnswers = Object.fromEntries((answers || []).map(answer => [answer.question_id, answer.selected_option_id]));
  const questions = questionIds.map(id => {
    const question = questionById.get(id);
    const orderedOptionIds = attempt.option_order?.[id] || [];
    const options = orderedOptionIds.map(optionId => {
      const option = optionById.get(optionId);
      if (!option || option.question_id !== id) throw new Error('Attempt option snapshot is invalid');
      return { id: option.id, optionText: option.option_text };
    });
    return { id: question.id, questionText: question.question_text, options };
  });

  return {
    attempt_id: attempt.id,
    exam_id: exam.id,
    status: 'active',
    started_at: attempt.started_at,
    deadline_at: attempt.deadline_at,
    questions,
    answers: userAnswers
  };
}

async function formatCrosswordAttempt(attempt, exam) {
  const { data: crossword, error: crosswordError } = await supabase
    .from('exam_crosswords')
    .select('id, title, grid_rows, grid_columns')
    .eq('exam_id', exam.id)
    .maybeSingle();
  if (crosswordError) throw crosswordError;
  if (!crossword) return safeExamResult(attempt);

  const { data: clues, error: clueError } = await supabase
    .from('exam_crossword_clues')
    .select('id, clue_number, clue_text, row, column, direction, points')
    .eq('crossword_id', crossword.id)
    .order('clue_number', { ascending: true });
  if (clueError) throw clueError;
  const { data: answers, error: answerError } = await supabase
    .from('exam_crossword_answers')
    .select('clue_id, submitted_answer')
    .eq('attempt_id', attempt.id);
  if (answerError) throw answerError;
  const submittedByClue = Object.fromEntries((answers || []).map(answer => [answer.clue_id, answer.submitted_answer]));
  const safeClues = (clues || []).map(clue => ({
    ...clue,
    answer_length: 0,
    submitted_answer: submittedByClue[clue.id] || ''
  }));
  // The key is read only to calculate a safe length for building letter cells.
  const { data: lengths, error: lengthError } = await supabase
    .from('exam_crossword_clues')
    .select('id, answer')
    .eq('crossword_id', crossword.id);
  if (lengthError) throw lengthError;
  const lengthById = new Map((lengths || []).map(clue => [clue.id, Array.from(String(clue.answer || '').replace(/[^A-Za-z0-9]/g, '')).length]));
  safeClues.forEach(clue => { clue.answer_length = lengthById.get(clue.id) || 0; });

  return {
    attempt_id: attempt.id,
    exam_id: exam.id,
    status: 'part_b',
    started_at: attempt.started_at,
    deadline_at: attempt.deadline_at,
    mcq: parseJsonField(attempt.result_data, {})?.mcq || null,
    crossword: {
      id: crossword.id,
      title: crossword.title,
      rows: crossword.grid_rows,
      columns: crossword.grid_columns,
      clues: safeClues
    },
    answers: submittedByClue
  };
}

async function checkExamEligibility(exam, userId) {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', exam.course_id)
    .maybeSingle();
  if (enrollmentError) throw enrollmentError;
  if (!enrollment) return 'Enroll in this course before starting its exam.';

  const progress = await courseLearningStore.getProgressSummary(userId, exam.course_id);
  if (!progress.totalLessons) return 'This course has no lessons available for exam eligibility.';
  if (progress.completedLessons < progress.totalLessons) {
    return 'Complete all course lessons before starting the final exam.';
  }
  return null;
}

async function submitExamAttemptAuthoritatively(attemptId, userId) {
  const { data, error } = await supabase.rpc('submit_exam_attempt', {
    p_attempt_id: attemptId,
    p_user_id: userId
  });
  if (error) throw error;
  return data;
}

app.get('/api/exams', authenticateToken, async (req, res) => {
  try {
    const courseId = req.query.course_id;
    if (typeof courseId !== 'string' || !courseId.trim()) {
      return res.status(400).json({ error: 'course_id is required' });
    }
    // Prefer the explicit is_final discriminator; fall back to the legacy
    // column set on schemas where the migration has not been applied yet.
    let examsQuery = supabase
      .from('exams')
      .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes, is_final')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });
    let { data: exams, error } = await examsQuery;
    if (error && /is_final|does not exist|unknown column/i.test(error.message || '')) {
      ({ data: exams, error } = await supabase
        .from('exams')
        .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true }));
    }
    if (error) throw error;

    const safeExams = await Promise.all((exams || []).map(async exam => {
      const { count, error: countError } = await supabase
        .from('exam_questions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', exam.id);
      if (countError) throw countError;
      return examMetadata(exam, count || 0);
    }));
    return res.json({ exams: safeExams });
  } catch (error) {
    console.error('Exam list error:', error);
    return res.status(500).json({ error: 'Failed to load exams' });
  }
});

app.get('/api/exams/:examId', authenticateToken, async (req, res) => {
  try {
    const metadata = await loadExamMetadata(req.params.examId);
    if (!metadata) return res.status(404).json({ error: 'Exam not found' });
    return res.json(metadata);
  } catch (error) {
    console.error('Exam metadata error:', error);
    return res.status(500).json({ error: 'Failed to load exam' });
  }
});

app.post('/api/exams/:examId/start', authenticateToken, async (req, res) => {
  try {
    const examId = req.params.examId;
    const userId = req.user.id;
    const retry = req.body?.retry === true;
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes')
      .eq('id', examId)
      .maybeSingle();
    if (examError) throw examError;
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const eligibilityError = await checkExamEligibility(exam, userId);
    if (eligibilityError) return res.status(403).json({ error: eligibilityError });

    const { data: activeAttempt, error: activeError } = await supabase
      .from('exam_attempts')
      .select('id, exam_id, user_id, attempt_number, score, passed, started_at, submitted_at, selected_question_ids, option_order, deadline_at, mcq_submitted_at, crossword_submitted_at, result_data')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .is('submitted_at', null)
      .maybeSingle();
    if (activeError) throw activeError;
    if (activeAttempt) {
      if (activeAttempt.deadline_at && new Date(activeAttempt.deadline_at) <= new Date()) {
        const result = await submitExamAttemptAuthoritatively(activeAttempt.id, userId);
        return res.json(result);
      }
      return res.json(await formatExamAttempt(activeAttempt, exam));
    }

    const { data: previousAttempts, error: historyError } = await supabase
      .from('exam_attempts')
      .select('id, exam_id, user_id, attempt_number, score, passed, started_at, submitted_at, selected_question_ids, option_order, deadline_at, mcq_submitted_at, crossword_submitted_at, result_data')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false })
      .limit(1);
    if (historyError) throw historyError;
    const latestAttempt = previousAttempts?.[0];
    if (latestAttempt && !retry) return res.json(await safeExamResult(latestAttempt));

    const eligibilityQuestionIds = await supabase
      .from('exam_questions')
      .select('id, question_text, points, question_order')
      .eq('exam_id', examId)
      .order('question_order', { ascending: true });
    if (eligibilityQuestionIds.error) throw eligibilityQuestionIds.error;
    // Keep the Introduction to AI & ML final to 10 MCQs. Older question
    // rows remain in the database to preserve historical attempts, but they
    // are not included in new attempts.
    const allQuestions = (eligibilityQuestionIds.data || []).slice(0, 10);
    if (!allQuestions.length) return res.status(409).json({ error: 'This exam has no questions yet.' });

    const { data: previousNumberRows, count: attemptCount, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select('attempt_number', { count: 'exact' })
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false })
      .limit(1);
    if (attemptsError) throw attemptsError;
    if (exam.max_attempts && attemptCount >= exam.max_attempts) {
      return res.status(409).json({ error: 'Maximum exam attempts reached.' });
    }
    const attemptNumber = (previousNumberRows?.[0]?.attempt_number || 0) + 1;

    const questionOrder = shuffleExamItems(allQuestions);
    const selectedQuestionIds = questionOrder.map(question => question.id);
    const { data: allOptions, error: optionsError } = await supabase
      .from('exam_options')
      .select('id, question_id')
      .in('question_id', selectedQuestionIds);
    if (optionsError) throw optionsError;
    const optionOrder = {};
    for (const questionId of selectedQuestionIds) {
      const options = shuffleExamItems((allOptions || []).filter(option => option.question_id === questionId));
      if (!options.length) return res.status(409).json({ error: 'A question is missing its answer options.' });
      optionOrder[questionId] = options.map(option => option.id);
    }

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + effectiveExamDurationMinutes(exam) * 60_000);
    const { data: createdAttempt, error: createError } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        user_id: userId,
        attempt_number: attemptNumber,
        started_at: startedAt.toISOString(),
        selected_question_ids: selectedQuestionIds,
        option_order: optionOrder,
        deadline_at: deadlineAt.toISOString()
      })
      .select('id, exam_id, user_id, attempt_number, score, passed, started_at, submitted_at, selected_question_ids, option_order, deadline_at, mcq_submitted_at, crossword_submitted_at, result_data')
      .single();
    if (createError) {
      if (createError.code === '23505') {
        const { data: concurrentAttempt, error: concurrentError } = await supabase
          .from('exam_attempts')
      .select('id, exam_id, user_id, attempt_number, score, passed, started_at, submitted_at, selected_question_ids, option_order, deadline_at, mcq_submitted_at, crossword_submitted_at, result_data')
          .eq('exam_id', examId)
          .eq('user_id', userId)
          .is('submitted_at', null)
          .maybeSingle();
        if (concurrentError) throw concurrentError;
        if (concurrentAttempt) return res.json(await formatExamAttempt(concurrentAttempt, exam));
      }
      throw createError;
    }
    return res.status(201).json(await formatExamAttempt(createdAttempt, exam));
  } catch (error) {
    console.error('Exam start error:', error);
    return res.status(500).json({ error: 'Failed to start or resume exam' });
  }
});

app.get('/api/exams/:examId/questions', authenticateToken, async (req, res) => {
  try {
    const attemptId = req.query.attempt_id;
    if (!isUuid(attemptId)) return res.status(400).json({ error: 'A valid attempt_id is required' });
    const attempt = await getOwnedExamAttempt(attemptId, req.params.examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.submitted_at) return res.status(409).json({ error: 'Attempt is already submitted' });
    if (attempt.mcq_submitted_at) return res.status(409).json({ error: 'Part A is already submitted' });
    if (!attempt.deadline_at || new Date(attempt.deadline_at) <= new Date()) {
      const result = await submitExamAttemptAuthoritatively(attempt.id, req.user.id);
      return res.status(410).json({ error: 'Attempt expired', result });
    }
    const { data: exam, error } = await supabase
      .from('exams')
      .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes')
      .eq('id', req.params.examId)
      .maybeSingle();
    if (error) throw error;
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    const attemptData = await formatExamAttempt(attempt, exam);
    return res.json({ attempt_id: attemptData.attempt_id, questions: attemptData.questions, answers: attemptData.answers });
  } catch (error) {
    console.error('Exam questions error:', error);
    return res.status(500).json({ error: 'Failed to load exam questions' });
  }
});

app.get('/api/exams/:examId/attempts/:attemptId/crossword', authenticateToken, async (req, res) => {
  try {
    const { examId, attemptId } = req.params;
    if (!isUuid(attemptId)) return res.status(400).json({ error: 'A valid attempt ID is required' });
    let attempt = await getOwnedExamAttempt(attemptId, examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.submitted_at) return res.status(409).json({ error: 'Exam attempt is finalized' });
    if (!attempt.mcq_submitted_at) return res.status(409).json({ error: 'Submit Part A before opening the crossword' });
    if (!attempt.deadline_at || new Date(attempt.deadline_at) <= new Date()) {
      const result = await submitExamAttemptAuthoritatively(attempt.id, req.user.id);
      return res.status(410).json({ error: 'Exam attempt expired', result });
    }
    const { data: exam, error } = await supabase
      .from('exams')
      .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes')
      .eq('id', examId)
      .maybeSingle();
    if (error) throw error;
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    return res.json(await formatCrosswordAttempt(attempt, exam));
  } catch (error) {
    console.error('Exam crossword delivery error:', error);
    return res.status(500).json({ error: 'Failed to load crossword' });
  }
});

app.post('/api/exams/:examId/crossword/answers', authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const allowedKeys = ['attempt_id', 'clue_id', 'answer'];
    if (Object.keys(body).some(key => !allowedKeys.includes(key)) ||
        !isUuid(body.attempt_id) || !isUuid(body.clue_id) ||
        typeof body.answer !== 'string' || body.answer.length > 100) {
      return res.status(400).json({ error: 'Provide only a valid attempt_id, clue_id, and answer.' });
    }
    const attempt = await getOwnedExamAttempt(body.attempt_id, req.params.examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    const { error } = await supabase.rpc('save_exam_crossword_answer', {
      p_attempt_id: body.attempt_id,
      p_user_id: req.user.id,
      p_clue_id: body.clue_id,
      p_answer: body.answer
    });
    if (error) {
      if (error.code === 'P0002') return res.status(404).json({ error: 'Attempt not found' });
      if (error.code === '55000') return res.status(409).json({ error: error.message });
      if (error.code === '22023' && error.message.includes('deadline has passed')) {
        const result = await submitExamAttemptAuthoritatively(attempt.id, req.user.id);
        return res.status(410).json({ error: 'Exam attempt expired', result });
      }
      if (error.code === '22023') return res.status(400).json({ error: error.message });
      throw error;
    }
    return res.json({ saved: true });
  } catch (error) {
    console.error('Crossword answer save error:', error);
    return res.status(500).json({ error: 'Failed to save crossword answer' });
  }
});

app.post('/api/exams/:examId/crossword/submit', authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    if (Object.keys(body).some(key => key !== 'attempt_id') || !isUuid(body.attempt_id)) {
      return res.status(400).json({ error: 'Provide only a valid attempt_id.' });
    }
    const attempt = await getOwnedExamAttempt(body.attempt_id, req.params.examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.submitted_at) return res.status(409).json({ error: 'Exam attempt is already finalized' });
    const { data, error } = await supabase.rpc('submit_exam_crossword', {
      p_attempt_id: attempt.id,
      p_user_id: req.user.id
    });
    if (error) {
      if (error.code === 'P0002') return res.status(404).json({ error: 'Attempt not found' });
      if (error.code === '55000') return res.status(409).json({ error: error.message });
      throw error;
    }
    return res.json(data);
  } catch (error) {
    console.error('Crossword submit error:', error);
    return res.status(500).json({ error: 'Failed to submit crossword' });
  }
});

app.post('/api/exams/:examId/answers', authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const allowedKeys = ['attempt_id', 'question_id', 'selected_option_id'];
    if (Object.keys(body).some(key => !allowedKeys.includes(key)) ||
        !isUuid(body.attempt_id) || !isUuid(body.question_id) || !isUuid(body.selected_option_id)) {
      return res.status(400).json({ error: 'Provide only valid attempt_id, question_id, and selected_option_id values.' });
    }
    const attempt = await getOwnedExamAttempt(body.attempt_id, req.params.examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    const { error } = await supabase.rpc('save_exam_answer', {
      p_attempt_id: body.attempt_id,
      p_user_id: req.user.id,
      p_question_id: body.question_id,
      p_selected_option_id: body.selected_option_id
    });
    if (error) {
      if (error.code === 'P0002') return res.status(404).json({ error: 'Attempt not found' });
      if (error.code === '55000') return res.status(409).json({ error: 'Attempt is already submitted' });
      if (error.code === '22023' && error.message.includes('deadline has passed')) {
        const result = await submitExamAttemptAuthoritatively(attempt.id, req.user.id);
        return res.status(410).json({ error: 'Attempt expired', result });
      }
      if (error.code === '22023') return res.status(400).json({ error: error.message });
      throw error;
    }
    return res.json({ saved: true });
  } catch (error) {
    console.error('Exam answer save error:', error);
    return res.status(500).json({ error: 'Failed to save answer' });
  }
});

app.post('/api/exams/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    if (Object.keys(body).some(key => key !== 'attempt_id') || !isUuid(body.attempt_id)) {
      return res.status(400).json({ error: 'Provide only a valid attempt_id.' });
    }
    const attempt = await getOwnedExamAttempt(body.attempt_id, req.params.examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.submitted_at) return res.status(409).json({ error: 'Exam attempt is already finalized' });
    if (attempt.mcq_submitted_at && attempt.deadline_at && new Date(attempt.deadline_at) > new Date()) {
      return res.status(409).json({ error: 'Part A is already submitted' });
    }
    const result = await submitExamAttemptAuthoritatively(attempt.id, req.user.id);
    return res.json(result);
  } catch (error) {
    console.error('Exam submit error:', error);
    if (error.code === 'P0002') return res.status(404).json({ error: 'Attempt not found' });
    return res.status(500).json({ error: 'Failed to submit exam' });
  }
});

app.get('/api/exams/:examId/result', authenticateToken, async (req, res) => {
  try {
    const attemptId = req.query.attempt_id;
    if (!isUuid(attemptId)) return res.status(400).json({ error: 'A valid attempt_id is required' });
    let attempt = await getOwnedExamAttempt(attemptId, req.params.examId, req.user.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (!attempt.submitted_at && attempt.deadline_at && new Date(attempt.deadline_at) <= new Date()) {
      await submitExamAttemptAuthoritatively(attempt.id, req.user.id);
      attempt = await getOwnedExamAttempt(attemptId, req.params.examId, req.user.id);
    }
    if (!attempt.submitted_at) return res.status(409).json({ error: 'Attempt has not been submitted' });
    return res.json(await safeExamResult(attempt));
  } catch (error) {
    console.error('Exam result error:', error);
    return res.status(500).json({ error: 'Failed to load exam result' });
  }
});

// Course catalog read endpoints.
// DB is authoritative: courses.image -> image_url, courses.weeks -> duration_weeks.
function formatCourse(course) {
  const level = course.level || 'beginner';
  return {
    id: course.id,
    // Preserve unknown states so a client can fail closed instead of treating
    // a missing status as available.
    status: course.status ?? null,
    title: course.title,
    description: course.description,
    image_url: course.image,
    badge: course.badge,
    difficulty: course.difficulty,
    duration_weeks: course.weeks,
    category: courseCatalogConfig.courseCategories[course.id] || 'Uncategorized',
    level: level,
    // Difficulty is not an access tier. No course entitlement system exists.
    premium: false
  };
}

app.get('/api/courses', authenticateToken, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, image, badge, difficulty, weeks, level, status')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    const courses = (data || []).map(formatCourse);
    const existingCourseIds = new Set(courses.map(course => course.id));
    const careerCourseMapping = Object.fromEntries(
      Object.entries(courseCatalogConfig.careerCourseMapping).map(([career, ids]) => [
        career,
        ids.filter(id => existingCourseIds.has(id))
      ])
    );

    const learningPathOrder = Object.fromEntries(
      Object.entries(courseCatalogConfig.learningPathOrder || {}).map(([career, ids]) => [career, ids.filter(id => existingCourseIds.has(id))])
    );

    res.json({
      categories: courseCatalogConfig.categories,
      career_course_mapping: careerCourseMapping,
      learning_path_order: learningPathOrder,
      courses
    });
  } catch (error) {
    console.error('Error in /api/courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, image, badge, difficulty, weeks, level, status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching course:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ course: formatCourse(data) });
  } catch (error) {
    console.error('Error in /api/courses/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/courses/:id/modules', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('id, course_id, title, description, module_order')
      .eq('course_id', req.params.id)
      .order('module_order', { ascending: true });

    if (error) {
      console.error('Error fetching modules:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ modules: data || [] });
  } catch (error) {
    console.error('Error in /api/courses/:id/modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/modules/:id/lessons', authenticateToken, async (req, res) => {
  try {
    // modules.id is a uuid column - reject malformed ids as a client error
    // instead of letting Postgres fail with 22P02.
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid module id' });
    }

    const { data, error } = await supabase
      .from('lessons')
      .select('id, module_id, title, content, lesson_order, duration_minutes')
      .eq('module_id', req.params.id)
      .order('lesson_order', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ lessons: data || [] });
  } catch (error) {
    console.error('Error in /api/modules/:id/lessons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Course endpoints
// Course endpoints
// Enrollment is served by course-enrollment-api.js (mounted above: idempotent
// create-or-return with unique-race recovery). The legacy progress router
// below preserves the established progress-update shape.
app.use('/api/progress', createProgressRouter({ supabase, authenticateToken }));

app.get('/api/enrollments', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      enrollments: (data || []).map(formatEnrollment)
    });
  } catch (error) {
    console.error('Enrollments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lesson progress endpoints - progress is derived from lesson_progress, never
// from a client-supplied value.
app.get('/api/courses/:courseId/progress/lessons', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    const summary = await courseLearningStore.getProgressSummary(userId, courseId);
    res.json({
      completedLessons: summary.completedLessonIds,
      completedCount: summary.completedLessons,
      totalLessons: summary.totalLessons,
      progress: summary.progress
    });
  } catch (error) {
    console.error('Lesson progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/lessons/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lessonId = req.params.lessonId;

    // lessons.id is a uuid column - reject malformed ids as a client error.
    if (!isUuid(lessonId)) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }

    // The lesson must exist
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id, title')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError) {
      console.error('Error fetching lesson:', lessonError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Resolve the lesson's course through its module
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', lesson.module_id)
      .maybeSingle();

    if (moduleError) {
      console.error('Error fetching module:', moduleError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!module) {
      return res.status(404).json({ error: 'Module not found for lesson' });
    }

    // The user must be enrolled in the course that owns this lesson
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, course_name')
      .eq('user_id', userId)
      .eq('course_id', module.course_id)
      .maybeSingle();

    if (enrollError) {
      console.error('Error fetching enrollment:', enrollError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Record completion (server-authoritative). A concurrent duplicate request
    // is treated as the same idempotent completion, not as a server failure.
    const now = new Date().toISOString();
    const persistence = await persistLessonCompletion(supabase, {
      userId,
      lessonId,
      completedAt: now
    });

    if (persistence.error) {
      if (persistence.operation === 'read') {
        console.error('Error checking lesson progress:', persistence.error);
        return res.status(500).json({ error: 'Database error' });
      }
      if (persistence.operation === 'update' || persistence.operation === 'concurrent-update') {
        console.error('Error updating lesson progress:', persistence.error);
        return res.status(500).json({ error: 'Failed to update lesson progress' });
      }
      console.error('Error inserting lesson progress:', persistence.error);
      return res.status(500).json({ error: 'Failed to save lesson progress' });
    }

    // Recalculate and persist the enrollment's progress from real lesson data
    const summary = await courseLearningStore.getProgressSummary(userId, module.course_id);

    const { error: progressUpdateError } = await supabase
      .from('enrollments')
      .update({
        progress: summary.progress,
        completed_hours: summary.completedHours,
        next_lesson_title: summary.nextLessonTitle
      })
      .eq('id', enrollment.id);

    if (progressUpdateError) {
      console.error('Error updating enrollment progress:', progressUpdateError);
      return res.status(500).json({ error: 'Failed to update course progress' });
    }

    if (summary.totalLessons > 0 && summary.completedLessons === summary.totalLessons) {
      try {
        await createNotification(supabase, {
          userId,
          type: 'course_completed',
          title: 'Course completed',
          body: `You completed ${enrollment.course_name || module.course_id}.`,
          href: `/course-detail.html?id=${encodeURIComponent(module.course_id)}`,
          dedupeKey: `course_completed:${module.course_id}`
        });
      } catch (notificationError) {
        // Completion is authoritative even before the notification migration is applied.
        console.error('Course completion notification error:', notificationError);
      }
    }

    res.json({
      lessonId: lessonId,
      completed: true,
      completedLessons: summary.completedLessons,
      totalLessons: summary.totalLessons,
      progress: summary.progress,
      completedLessonIds: summary.completedLessonIds
    });
  } catch (error) {
    console.error('Lesson complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/lessons', createLessonProgressRouter({ supabase, authenticateToken, courseLearningStore }));

// Profile update
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, careerGoal } = req.body;
    const userId = req.user.id;

    const updates = {};
    if (typeof fullName === 'string' && fullName.trim()) updates.full_name = fullName.trim();
    if (typeof careerGoal === 'string' && careerGoal.trim()) updates.career_goal = careerGoal.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid profile fields provided' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, full_name, career_goal')
      .maybeSingle();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    let profile = data;

    // Auth users may not have a public.users row yet - create it.
    if (!profile) {
      const { data: created, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          full_name: updates.full_name || req.user.name,
          career_goal: updates.career_goal || 'undecided'
        })
        .select('id, full_name, career_goal')
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      profile = created;
    }

    res.json({
      id: profile.id,
      email: req.user.email,
      full_name: profile.full_name,
      name: profile.full_name,
      career_goal: profile.career_goal,
      careerGoal: profile.career_goal
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Chatbot endpoints. Gemini credentials remain server-side only.
app.use('/api', createChatRouter({
  supabase,
  authenticateToken,
  generateReply: async (message) => {
    if (typeof message !== 'string' || !message.trim()) {
      const error = new Error('Message is required');
      error.status = 400;
      throw error;
    }
    if (message.length > 4000) {
      const error = new Error('Message is too long. Please keep it under 4,000 characters.');
      error.status = 400;
      throw error;
    }

    const ai = getGenAIClient();
    const result = await ai.models.generateContent({
      // Override in Render if the selected model is unavailable to this API key.
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: message.trim(),
      config: {
        systemInstruction: [
          'You are CareerPath Guide, a concise website navigation helper for the CareerPath AI platform.',
          'Your main job is to help visitors find login and registration, courses, course topics, the guided tour, Programming Studio, Career Test, dashboard, profile, and contact support.',
          'Keep replies short and practical. Explain where to click or what a page is for; do not act as a career counsellor or provide long general lessons.',
          'Never invent a page, URL, course, feature, or account status. If you do not know the exact destination, say so and recommend the course catalogue or guided tour.',
          'For login, registration, courses, demos, coding practice, Career Test, dashboard, and profile, give only simple website-use guidance.',
          'Do not ask for passwords, API keys, payment details, or sensitive personal information.'
        ].join(' ')
      }
    });

    // In @google/genai, response.text is a property, not a function.
    const text = typeof result.text === 'function' ? result.text() : result.text;
    if (typeof text !== 'string' || !text.trim()) {
      const error = new Error('The AI provider returned an empty response');
      error.status = 502;
      throw error;
    }
    return text.trim();
  }
}));

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize database
  initializeDatabase();
});

module.exports = app;
