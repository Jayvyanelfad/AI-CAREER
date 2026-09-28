// CUSTOM IDENTIFIER TO VERIFY WHICH FILE IS LOADING - SUPABASE ONLY IMPLEMENTATION
console.log('SERVER STARTING - LOADED SERVER.JS (SUPABASE ONLY)');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const { randomInt } = require('crypto');
const courseCatalogConfig = require('./course-catalog-config.json');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
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
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const CAREER_ASSESSMENT_DIMENSIONS = [
  'Software Engineering',
  'Data & Analytical Thinking',
  'AI & Computational Intelligence',
  'Systems & Infrastructure',
  'Security & Reliability',
  'Product & User Orientation',
  'Design & Human Experience',
  'Leadership & Delivery'
];

const CAREER_PROFILE_V1 = {
  'Software Developer': [0.95, 0.70, 0.65, 0.60, 0.55, 0.45, 0.40, 0.45],
  'Data Scientist': [0.55, 0.95, 0.90, 0.35, 0.40, 0.55, 0.35, 0.45],
  'Full Stack Developer': [0.95, 0.60, 0.55, 0.55, 0.50, 0.65, 0.65, 0.45],
  'Frontend Developer': [0.85, 0.45, 0.40, 0.30, 0.40, 0.80, 0.90, 0.50],
  'Backend Developer': [0.95, 0.65, 0.55, 0.65, 0.60, 0.45, 0.30, 0.45],
  'AI/ML Engineer': [0.80, 0.85, 1.00, 0.65, 0.50, 0.45, 0.30, 0.45],
  'Data Analyst': [0.45, 0.95, 0.55, 0.30, 0.40, 0.70, 0.40, 0.50],
  'Cloud Architect': [0.60, 0.60, 0.40, 1.00, 0.75, 0.50, 0.35, 0.75],
  'DevOps Engineer': [0.70, 0.55, 0.35, 0.95, 0.85, 0.40, 0.30, 0.60],
  'UI/UX Designer': [0.30, 0.35, 0.25, 0.20, 0.30, 0.90, 1.00, 0.55],
  'Product Manager': [0.35, 0.55, 0.35, 0.35, 0.40, 1.00, 0.65, 1.00]
};

function calculateCareerAssessmentV1(questionRows, submittedAnswers) {
  const dimensionValues = Object.fromEntries(CAREER_ASSESSMENT_DIMENSIONS.map(name => [name, []]));
  questionRows.forEach(question => {
    const value = Number(submittedAnswers[question.id]);
    dimensionValues[question.category].push((value - 1) / 4);
  });

  const dimensionScores = Object.fromEntries(CAREER_ASSESSMENT_DIMENSIONS.map(name => {
    const values = dimensionValues[name];
    return [name, values.reduce((sum, value) => sum + value, 0) / values.length];
  }));

  const topCareers = Object.entries(CAREER_PROFILE_V1)
    .map(([career, profile]) => {
      const difference = profile.reduce((sum, reference, index) => {
        return sum + Math.abs(dimensionScores[CAREER_ASSESSMENT_DIMENSIONS[index]] - reference);
      }, 0) / CAREER_ASSESSMENT_DIMENSIONS.length;
      const similarity = 1 - difference;
      return { career, score: Number((similarity * 100).toFixed(2)), similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(({ career, score }) => ({ career, score }));

  const strengths = CAREER_ASSESSMENT_DIMENSIONS
    .map((dimension, index) => ({ dimension, index, score: dimensionScores[dimension] }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ dimension }) => `Strong ${dimension} orientation`);

  return { dimensionScores, topCareers, strengths };
}

// Map an enrollments row (snake_case) to the camelCase shape the frontend uses.
function formatEnrollment(enrollment) {
  const progressAvailable = typeof enrollment.progress === 'number' && Number.isFinite(enrollment.progress);
  return {
    id: enrollment.id,
    courseId: enrollment.course_id,
    courseName: enrollment.course_name,
    progress: enrollment.progress || 0,
    progressAvailable,
    completedHours: enrollment.completed_hours || 0,
    totalHours: enrollment.total_hours || 0,
    nextLessonTitle: enrollment.next_lesson_title || 'Next lesson',
    enrolledAt: enrollment.enrolled_at
  };
}

// All lesson ids belonging to a course, via modules -> lessons.
async function getCourseLessonIds(courseId) {
  const { data: modules, error: moduleError } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', courseId);

  if (moduleError || !modules || modules.length === 0) return [];

  const { data: lessons, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, lesson_order, duration_minutes')
    .in('module_id', modules.map(m => m.id))
    .order('lesson_order', { ascending: true });

  if (lessonError || !lessons) return [];
  return lessons;
}

// Recalculate enrollment progress from lesson_progress (server-authoritative).
async function recomputeEnrollmentProgress(userId, courseId) {
  const lessons = await getCourseLessonIds(courseId);
  const totalLessons = lessons.length;

  if (totalLessons === 0) {
    return { totalLessons: 0, completedLessons: 0, progress: 0, completedHours: 0, nextLessonTitle: null };
  }

  const { data: progressRows, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', lessons.map(l => l.id));

  if (progressError) throw progressError;

  const completedIds = new Set((progressRows || []).map(row => row.lesson_id));
  const completedCount = lessons.filter(l => completedIds.has(l.id)).length;

  const completedMinutes = lessons
    .filter(l => completedIds.has(l.id))
    .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

  const nextLesson = lessons.find(l => !completedIds.has(l.id));

  return {
    totalLessons,
    completedLessons: completedCount,
    progress: Math.round((completedCount / totalLessons) * 100),
    completedHours: Math.round(completedMinutes / 60),
    nextLessonTitle: nextLesson ? nextLesson.title : null
  };
}

// Latest career assessment for a user.
// ONLY career_test_attempts is treated as the current assessment. The legacy
// career_test table is retained as historical data but is NOT surfaced as the
// user's current result (it holds pre-CS-assessment results).
async function getLatestCareerAssessment(userId, completedOnly = false) {
  let attemptQuery = supabase
    .from('career_test_attempts')
    .select('id, top_careers, score_data, completed, created_at')
    .eq('user_id', userId);
  if (completedOnly) attemptQuery = attemptQuery.eq('completed', true);

  const { data: attempts, error: attemptError } = await attemptQuery
    .order('created_at', { ascending: false })
    .limit(1);

  if (attemptError) {
    console.error('Error fetching career assessment:', attemptError);
    return null;
  }

  if (!attempts || attempts.length === 0) return null;

  // strengths live inside score_data (career_test_attempts has no strengths column)
  const scoreData = parseJsonField(attempts[0].score_data, {}) || {};

  return {
    attemptId: attempts[0].id,
    completed: Boolean(attempts[0].completed),
    topCareers: normalizeTopCareers(attempts[0].top_careers),
    strengths: Array.isArray(scoreData.strengths) ? scoreData.strengths : [],
    assessmentVersion: scoreData.assessment_version || null,
    dimensionScores: scoreData.dimension_scores || null,
    completedAt: attempts[0].created_at
  };
}

// Has the user completed a career assessment? Used by the auth callback flow.
async function hasCompletedCareerTest(userId) {
  const assessment = await getLatestCareerAssessment(userId);
  return Boolean(assessment && assessment.completed);
}

// Authentication middleware - verify Supabase JWT and fetch user metadata
async function authenticateToken(req, res, next) {
  console.log('AUTH MIDDLEWARE: Checking token');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('AUTH MIDDLEWARE: Checking authorization header');

  if (!token) {
    console.log('AUTH MIDDLEWARE: No token, returning 401');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await createAuthClient().auth.getUser(token);
    if (error) {
      console.log('AUTH MIDDLEWARE: Invalid token, returning 401');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!user) {
      console.log('AUTH MIDDLEWARE: No user found, returning 401');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user metadata from our public.users table
    const { data: userMetadata, error: metadataError } = await supabase
      .from('users')
      .select('full_name, career_goal')
      .eq('id', user.id)
      .single();

    if (metadataError) {
      console.error('AUTH MIDDLEWARE: Error fetching user metadata');
      // Fallback to auth user data if metadata fetch fails
      req.user = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        careerGoal: user.user_metadata?.career_goal || 'undecided'
      };
    } else {
      // Format user object to match existing expectations
      req.user = {
        id: user.id,
        email: user.email,
        name: userMetadata.full_name || user.email.split('@')[0],
        careerGoal: userMetadata.career_goal || 'undecided'
      };
    }

    console.log('AUTH MIDDLEWARE: Token valid, setting req.user and calling next');
    next();
  } catch (error) {
    console.error('AUTH MIDDLEWARE: Error verifying token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Initialize database tables (Supabase handles this, but we'll keep the function for compatibility)
function initializeDatabase() {
  console.log('Supabase connected - tables should exist via dashboard');
  // In a real migration, you might run SQL migrations here
  // But for now, we assume tables are set up in Supabase dashboard
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
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

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, careerGoal } = req.body;
    const authClient = createAuthClient();

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Use provided careerGoal or default to 'undecided'
    const goal = careerGoal || 'undecided';

    // Register user with Supabase Auth
    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          // We'll store minimal data in auth.user_metadata, but our main data is in public.users
          // This is just for basic auth user info
          full_name: name
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return res.status(400).json({ error: 'User already exists' });
      }
      return res.status(400).json({ error: error.message });
    }

    const { user } = data;

    // Supabase can return a user with no identities for a duplicate email when
    // it suppresses the explicit "already registered" error. Do not turn that
    // duplicate registration into a password login below.
    if (user && Array.isArray(user.identities) && user.identities.length === 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Insert user metadata into our public.users table
    const { error: metadataError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        full_name: name,
        career_goal: goal
      });

    if (metadataError) {
      console.error('Error inserting user metadata:', metadataError);
      // We don't fail the registration if metadata insert fails, but we should log it
      // In a production system, we might want to rollback the auth user creation
    }

    // Try to create a session immediately (if email confirmation is not required)
    const { data: sessionData, error: sessionError } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError) {
      // If we can't create session immediately (e.g., email confirmation required),
      // still return success but without token - frontend should handle this
      return res.status(201).json({
        message: 'User created successfully. Please check your email to confirm your account.',
        user: { id: user.id, email: user.email, name, careerGoal: goal }
      });
    }

    const { session } = sessionData;

    res.status(201).json({
      token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name,
        careerGoal: goal
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const authClient = createAuthClient();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      const message = String(error.message || '');
      if (/email not confirmed|not confirmed|confirm/i.test(message)) {
        return res.status(400).json({ error: 'Email not confirmed. Check your email to confirm your account before signing in.' });
      }
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { user, session } = data;

    // Fetch user metadata from our public.users table
    const { data: userMetadata, error: metadataError } = await supabase
      .from('users')
      .select('full_name, career_goal')
      .eq('id', user.id)
      .single();

    if (metadataError) {
      console.error('Error fetching user metadata:', metadataError);
      // Fallback to auth user data
      res.json({
        token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          careerGoal: user.user_metadata?.career_goal || 'undecided'
        }
      });
    } else {
      res.json({
        token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          name: userMetadata.full_name || user.email.split('@')[0],
          careerGoal: userMetadata.career_goal || 'undecided'
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or repair the application's profile row after browser-side signup or
// email confirmation. The authenticated Supabase user is the source of truth.
app.post('/api/auth/complete-registration', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: req.user.id,
        full_name: req.user.name,
        career_goal: req.user.careerGoal || 'undecided'
      }, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error('Error completing registration profile:', error);
      return res.status(500).json({ error: 'Could not complete account setup' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error completing registration profile:', error);
    return res.status(500).json({ error: 'Could not complete account setup' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // public.users has NO email column - email comes from the authenticated Supabase user.
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, full_name, career_goal')
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
      return res.status(404).json({ error: 'No career test found' });
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
    console.error('Career test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Certificates are issued only from server-verified enrollment, lesson, and
// latest final-exam attempt records. The certificates row's UUID is also its
// stable public verification identifier.
async function certificatePresentation(certificate) {
  const { data: learner, error } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', certificate.user_id)
    .maybeSingle();
  if (error) throw error;
  return {
    certificateId: certificate.id,
    learnerName: learner?.full_name || 'CareerPath AI Learner',
    courseId: certificate.course_id,
    courseTitle: certificate.course_name,
    issuedAt: certificate.earned_at,
    status: 'issued',
    valid: true
  };
}

async function getCertificateForUser(certificateId, userId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, user_id, course_id, course_name, earned_at')
    .eq('id', certificateId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

app.get('/api/certificate/verify/:certificateId', async (req, res) => {
  try {
    if (!isUuid(req.params.certificateId)) {
      return res.status(400).json({ valid: false, status: 'invalid_id' });
    }
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('id, user_id, course_id, course_name, earned_at')
      .eq('id', req.params.certificateId)
      .maybeSingle();
    if (error) throw error;
    if (!certificate) return res.status(404).json({ valid: false, status: 'not_found' });
    return res.json(await certificatePresentation(certificate));
  } catch (error) {
    console.error('Certificate verification error:', error);
    return res.status(500).json({ error: 'Certificate verification is unavailable' });
  }
});

app.get('/api/certificate/id/:certificateId', authenticateToken, async (req, res) => {
  try {
    if (!isUuid(req.params.certificateId)) return res.status(404).json({ error: 'Certificate not found' });
    const certificate = await getCertificateForUser(req.params.certificateId, req.user.id);
    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
    return res.json(await certificatePresentation(certificate));
  } catch (error) {
    console.error('Certificate retrieval error:', error);
    return res.status(500).json({ error: 'Failed to load certificate' });
  }
});

app.get('/api/certificate/:courseId', authenticateToken, async (req, res) => {
  try {
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('id, user_id, course_id, course_name, earned_at')
      .eq('course_id', req.params.courseId)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
    return res.json(await certificatePresentation(certificate));
  } catch (error) {
    console.error('Certificate retrieval error:', error);
    return res.status(500).json({ error: 'Failed to load certificate' });
  }
});

app.post('/api/certificate/:courseId/issue', authenticateToken, async (req, res) => {
  try {
    if (Object.keys(req.body || {}).length) {
      return res.status(400).json({ error: 'Certificate issuance does not accept client-provided result data' });
    }
    const userId = req.user.id;
    const courseId = req.params.courseId;

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (enrollmentError) throw enrollmentError;
    if (!enrollment) return res.status(403).json({ error: 'Enroll in this course before requesting its certificate' });

    const { data: modules, error: moduleError } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);
    if (moduleError) throw moduleError;
    const moduleIds = (modules || []).map(module => module.id);
    if (!moduleIds.length) return res.status(409).json({ error: 'The course has no required lessons' });
    const { data: lessons, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);
    if (lessonError) throw lessonError;
    const lessonIds = (lessons || []).map(lesson => lesson.id);
    if (!lessonIds.length) return res.status(409).json({ error: 'The course has no required lessons' });
    const { data: progress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', lessonIds);
    if (progressError) throw progressError;
    const completedIds = new Set((progress || []).map(row => row.lesson_id));
    if (lessonIds.some(id => !completedIds.has(id))) {
      return res.status(409).json({ error: 'Complete every required course lesson before requesting its certificate' });
    }

    const { data: courseExams, error: examError } = await supabase
      .from('exams')
      .select('id, title')
      .eq('course_id', courseId);
    if (examError) throw examError;
    const eligibleExams = [];
    for (const candidate of courseExams || []) {
      const { count, error } = await supabase
        .from('exam_questions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', candidate.id);
      if (error) throw error;
      // The current live schema has no final-exam discriminator. Its existing
      // exam records identify the final assessment in the title; section quizzes
      // are deliberately excluded here.
      if (count > 0 && /\bfinal\s+exam\b/i.test(candidate.title || '')) eligibleExams.push(candidate);
    }
    if (eligibleExams.length !== 1) {
      return res.status(409).json({ error: 'A single configured final exam is required for certificate issuance' });
    }

    const { data: latestAttempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('id, submitted_at, passed, attempt_number')
      .eq('exam_id', eligibleExams[0].id)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!latestAttempt || !latestAttempt.submitted_at || latestAttempt.passed !== true) {
      return res.status(403).json({ error: 'Pass the latest submitted final exam attempt before requesting a certificate' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('certificates')
      .select('id, user_id, course_id, course_name, earned_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return res.json({ success: true, certificate: await certificatePresentation(existing) });

    const { data: created, error: insertError } = await supabase
      .from('certificates')
      .insert({ user_id: userId, course_id: courseId, course_name: course.title })
      .select('id, user_id, course_id, course_name, earned_at')
      .single();
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: concurrentCertificate, error: concurrentError } = await supabase
          .from('certificates')
          .select('id, user_id, course_id, course_name, earned_at')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
        if (concurrentError) throw concurrentError;
        if (concurrentCertificate) return res.json({ success: true, certificate: await certificatePresentation(concurrentCertificate) });
      }
      throw insertError;
    }
    return res.status(201).json({ success: true, certificate: await certificatePresentation(created) });
  } catch (error) {
    console.error('Certificate issuance error:', error);
    return res.status(500).json({ error: 'Failed to issue certificate' });
  }
});

// Dashboard endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // public.users has NO email column - email comes from the authenticated Supabase user.
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, career_goal')
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
      console.error('Error fetching activity:', activityError);
    }

    const enrollments = enrollData || [];
    const certificates = certData || [];

    const latestAssessment = await getLatestCareerAssessment(userId);
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
        careerGoal: (userData && userData.career_goal) || 'undecided'
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

function examMetadata(exam, questionCount) {
  return {
    id: exam.id,
    course_id: exam.course_id,
    title: exam.title,
    description: exam.description || '',
    passing_score: exam.passing_score,
    duration_minutes: exam.duration_minutes,
    max_attempts: exam.max_attempts,
    question_count: questionCount
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

  const lessons = await getCourseLessonIds(exam.course_id);
  if (!lessons.length) return 'This course has no lessons available for exam eligibility.';
  const { data: completed, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', lessons.map(lesson => lesson.id));
  if (progressError) throw progressError;
  const completedIds = new Set((completed || []).map(row => row.lesson_id));
  if (lessons.some(lesson => !completedIds.has(lesson.id))) {
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
    const { data: exams, error } = await supabase
      .from('exams')
      .select('id, course_id, title, description, passing_score, max_attempts, duration_minutes')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });
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
    const allQuestions = eligibilityQuestionIds.data || [];
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
    const deadlineAt = new Date(startedAt.getTime() + Number(exam.duration_minutes) * 60_000);
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
      .select('id, title, description, image, badge, difficulty, weeks, level')
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

    res.json({
      categories: courseCatalogConfig.categories,
      career_course_mapping: careerCourseMapping,
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
      .select('id, title, description, image, badge, difficulty, weeks, level')
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
app.post('/api/enroll', authenticateToken, async (req, res) => {
  try {
    const { courseId, totalHours } = req.body;
    const userId = req.user.id;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Validate the course exists. The courses table is the source of truth for the name.
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) {
      console.error('Error validating course:', courseError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Prevent duplicate enrollment
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (checkError) {
      console.error('Error checking enrollment:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingEnrollment && existingEnrollment.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Insert enrollment with progress initialized safely
    const { data: createdEnrollment, error: insertError } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        course_name: course.title || courseId,
        progress: 0,
        completed_hours: 0,
        total_hours: totalHours || 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting enrollment:', insertError);
      return res.status(500).json({ error: 'Failed to enroll in course' });
    }

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment: formatEnrollment(createdEnrollment)
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/progress', authenticateToken, async (req, res) => {
  try {
    const { enrollmentId, progress, completedHours } = req.body;

    if (enrollmentId === undefined || progress === undefined) {
      return res.status(400).json({ error: 'Enrollment ID and progress are required' });
    }

    // Update progress
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({
        progress: progress,
        completedHours: completedHours || 0
      })
      .eq('id', enrollmentId)
      .eq('userId', req.user.id);

    if (updateError) {
      console.error('Error updating progress:', updateError);
      return res.status(500).json({ error: 'Failed to update progress' });
    }

    // Check if any rows were updated
    const { count } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('id', enrollmentId)
      .eq('userId', req.user.id);

    if (count === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

app.get('/api/enrollments/:courseId', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('course_id', req.params.courseId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching enrollment:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    res.json(formatEnrollment(data));
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lesson progress endpoints - progress is derived from lesson_progress, never
// from a client-supplied value.
app.get('/api/courses/:courseId/progress/lessons', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.params.courseId;

    const lessons = await getCourseLessonIds(courseId);

    if (lessons.length === 0) {
      return res.json({ completedLessons: [] });
    }

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', lessons.map(l => l.id));

    if (error) {
      console.error('Error fetching lesson progress:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ completedLessons: (data || []).map(row => row.lesson_id) });
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
      .select('id')
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

    // Record completion (server-authoritative). Update the existing row if there
    // is one, otherwise insert a new one.
    const { data: existingRow, error: existingError } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking lesson progress:', existingError);
      return res.status(500).json({ error: 'Database error' });
    }

    const now = new Date().toISOString();

    if (existingRow) {
      const { error: updateError } = await supabase
        .from('lesson_progress')
        .update({ completed: true, completed_at: now, updated_at: now })
        .eq('id', existingRow.id);

      if (updateError) {
        console.error('Error updating lesson progress:', updateError);
        return res.status(500).json({ error: 'Failed to update lesson progress' });
      }
    } else {
      const { error: insertError } = await supabase
        .from('lesson_progress')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          completed: true,
          completed_at: now
        });

      if (insertError) {
        console.error('Error inserting lesson progress:', insertError);
        return res.status(500).json({ error: 'Failed to save lesson progress' });
      }
    }

    // Recalculate and persist the enrollment's progress from real lesson data
    const summary = await recomputeEnrollmentProgress(userId, module.course_id);

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
      // The lesson completion itself succeeded, so do not fail the request.
    }

    res.json({
      lessonId: lessonId,
      completed: true,
      completedLessons: summary.completedLessons,
      totalLessons: summary.totalLessons,
      progress: summary.progress
    });
  } catch (error) {
    console.error('Lesson complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// AI Chatbot endpoints (keep same logic)
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  console.log('AI chat endpoint hit');
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create prompt with context
    const prompt = `
      You are CareerPath AI, an helpful career advisor. The user is asking: "${message}"

      Provide helpful, accurate advice about tech careers, learning paths, courses, resumes, and interview preparation.
      Keep responses concise but informative. If you don't know something specific, say so and offer to help with related topics.
    `;

    const result = await genAI.models.generateContent({
      model: 'gemini-pro-latest',
      contents: prompt
    });
    const text = result.text();

    // Save chat history using Supabase
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        userId: userId,
        message: message,
        response: text
      });

    if (chatError) {
      console.warn('Failed to save chat history:', chatError);
    }

    res.json({ reply: text });
  } catch (error) {
    console.error('AI chat error:', error);
    if ((error.error && error.error.code === 429) || error.status === 429) {
      return res.status(503).json({ error: 'AI service temporarily unavailable due to quota exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('userId', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      history: data.map(chat => ({
        message: chat.message,
        response: chat.response,
        timestamp: chat.createdAt
      }))
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/chat/clear', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('userId', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to clear chat history' });
    }

    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize database
  initializeDatabase();
});

module.exports = app;
