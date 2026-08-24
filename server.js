// CUSTOM IDENTIFIER TO VERIFY WHICH FILE IS LOADING - SUPABASE ONLY IMPLEMENTATION
console.log('SERVER STARTING - LOADED SERVER.JS (SUPABASE ONLY)');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Supabase setup (using service role key for backend operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gemini AI setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    const { data: { user }, error } = await supabase.auth.getUser(token);
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

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, careerGoal } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Use provided careerGoal or default to 'undecided'
    const goal = careerGoal || 'undecided';

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
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

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
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

app.get('/api/auth/me', authenticateToken, (req, res) => {
  // Return user data in expected format
  res.json({ user: req.user });
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
    console.log('CAREER TEST ENDPOINT CALLED - VERIFYING SERVER IS USING UPDATED FILE');
    const { answers } = req.body;
    const userId = req.user.id;

    console.log('Career test received:', { answers, userId });

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers are required' });
    }

    console.log('TEST LOG: About to process answers - this should appear in logs');

    // Career database with scoring weights (same as before)
    const careers = {
      "Software Developer": {
        weights: {
          team: 1, mentor: 2, independent: 3, creative: 1,
          startup: 2, corporate: 2, remote: 3, hybrid: 2,
          pressure: 2, planner: 3, adaptive: 2, process: 2,
          impact: 2, growth: 3, stability: 2, innovation: 3,
          frontend: 2, backend: 2, data: 1, infrastructure: 1,
          buildAI: 1, useAI: 2, analyzeData: 3, traditional: 2,
          visual: 1, algorithmic: 3, architecture: 2, fullstack: 3,
          handsOn: 3, structured: 2, community: 2, theory: 1,
          breakdown: 3, research: 2, experiment: 3, collaborate: 2,
          detective: 3, strategic: 3, necessary: 2, prevent: 1,
          satisfaction: 2, quality: 3, accuracy: 2, innovationMeasure: 3,
          active: 2, selective: 2, formal: 2, work: 2,
          expert: 3, leader: 2, fullstackExpert: 3, impactVision: 2,
          salary: 2, balance: 3, learning: 3, autonomy: 2,
          innovationCulture: 3, stable: 2, impactCulture: 2, creativeCulture: 2
        }
      },
      "Frontend Developer": {
        weights: {
          team: 2, mentor: 2, independent: 2, creative: 3,
          startup: 3, corporate: 1, remote: 3, hybrid: 2,
          pressure: 1, planner: 2, adaptive: 3, process: 1,
          impact: 3, growth: 2, stability: 1, innovation: 2,
          frontend: 3, backend: 1, data: 1, infrastructure: 1,
          buildAI: 1, useAI: 2, analyzeData: 1, traditional: 1,
          visual: 3, algorithmic: 1, architecture: 1, fullstack: 2,
          handsOn: 3, structured: 2, community: 2, theory: 1,
          breakdown: 2, research: 2, experiment: 3, collaborate: 3,
          detective: 1, strategic: 2, necessary: 2, prevent: 1,
          satisfaction: 3, quality: 2, accuracy: 1, innovationMeasure: 2,
          active: 3, selective: 2, formal: 1, work: 2,
          expert: 2, leader: 1, fullstackExpert: 2, impactVision: 3,
          salary: 1, balance: 3, learning: 2, autonomy: 3,
          innovationCulture: 3, stable: 1, impactCulture: 2, creativeCulture: 3
        }
      },
      "Backend Developer": {
        weights: {
          team: 2, mentor: 3, independent: 2, creative: 1,
          startup: 1, corporate: 3, remote: 2, hybrid: 2,
          pressure: 2, planner: 3, adaptive: 2, process: 3,
          impact: 2, growth: 2, stability: 3, innovation: 1,
          frontend: 1, backend: 3, data: 2, infrastructure: 2,
          buildAI: 2, useAI: 2, analyzeData: 3, traditional: 3,
          visual: 1, algorithmic: 3, architecture: 3, fullstack: 2,
          handsOn: 2, structured: 3, community: 2, theory: 2,
          breakdown: 3, research: 3, experiment: 1, collaborate: 2,
          detective: 2, strategic: 3, necessary: 3, prevent: 2,
          satisfaction: 2, quality: 3, accuracy: 3, innovationMeasure: 1,
          active: 2, selective: 3, formal: 3, work: 2,
          expert: 3, leader: 2, fullstackExpert: 2, impactVision: 1,
          salary: 3, balance: 1, learning: 2, autonomy: 1,
          innovationCulture: 1, stable: 3, impactCulture: 1, creativeCulture: 1
        }
      },
      "Full Stack Developer": {
        weights: {
          team: 2, mentor: 2, independent: 2, creative: 2,
          startup: 2, corporate: 2, remote: 3, hybrid: 3,
          pressure: 2, planner: 3, adaptive: 3, process: 2,
          impact: 2, growth: 3, stability: 2, innovation: 2,
          frontend: 2, backend: 2, data: 2, infrastructure: 2,
          buildAI: 2, useAI: 2, analyzeData: 2, traditional: 2,
          visual: 2, algorithmic: 2, architecture: 2, fullstack: 3,
          handsOn: 3, structured: 2, community: 3, theory: 1,
          breakdown: 2, research: 2, experiment: 3, collaborate: 3,
          detective: 2, strategic: 2, necessary: 2, prevent: 1,
          satisfaction: 2, quality: 2, accuracy: 2, innovationMeasure: 2,
          active: 2, selective: 2, formal: 2, work: 3,
          expert: 2, leader: 2, fullstackExpert: 3, impactVision: 2,
          salary: 2, balance: 2, learning: 3, autonomy: 2,
          innovationCulture: 2, stable: 2, impactCulture: 2, creativeCulture: 2
        }
      },
      "Data Scientist": {
        weights: {
          team: 2, mentor: 2, independent: 3, creative: 1,
          startup: 2, corporate: 3, remote: 3, hybrid: 2,
          pressure: 1, planner: 3, adaptive: 2, process: 2,
          impact: 2, growth: 3, stability: 2, innovation: 3,
          frontend: 1, backend: 1, data: 3, infrastructure: 1,
          buildAI: 3, useAI: 3, analyzeData: 3, traditional: 1,
          visual: 1, algorithmic: 3, architecture: 2, fullstack: 1,
          handsOn: 2, structured: 3, community: 2, theory: 3,
          breakdown: 3, research: 3, experiment: 2, collaborate: 2,
          detective: 3, strategic: 3, necessary: 2, prevent: 1,
          satisfaction: 2, quality: 2, accuracy: 3, innovationMeasure: 3,
          active: 3, selective: 2, formal: 3, work: 1,
          expert: 3, leader: 1, fullstackExpert: 1, impactVision: 2,
          salary: 2, balance: 2, learning: 3, autonomy: 2,
          innovationCulture: 3, stable: 1, impactCulture: 2, creativeCulture: 1
        }
      },
      "AI/ML Engineer": {
        weights: {
          team: 2, mentor: 2, independent: 3, creative: 1,
          startup: 3, corporate: 2, remote: 3, hybrid: 2,
          pressure: 2, planner: 2, adaptive: 2, process: 1,
          impact: 2, growth: 3, stability: 1, innovation: 3,
          frontend: 1, backend: 1, data: 2, infrastructure: 1,
          buildAI: 3, useAI: 2, analyzeData: 3, traditional: 1,
          visual: 1, algorithmic: 3, architecture: 2, fullstack: 1,
          handsOn: 2, structured: 2, community: 2, theory: 3,
          breakdown: 2, research: 2, experiment: 3, collaborate: 2,
          detective: 2, strategic: 2, necessary: 1, prevent: 1,
          satisfaction: 2, quality: 2, accuracy: 2, innovationMeasure: 3,
          active: 3, selective: 1, formal: 2, work: 1,
          expert: 3, leader: 1, fullstackExpert: 1, impactVision: 1,
          salary: 1, balance: 1, learning: 3, autonomy: 2,
          innovationCulture: 3, stable: 1, impactCulture: 2, creativeCulture: 1
        }
      },
      "Data Analyst": {
        weights: {
          team: 2, mentor: 2, independent: 2, creative: 1,
          startup: 2, corporate: 3, remote: 2, hybrid: 2,
          pressure: 1, planner: 3, adaptive: 2, process: 3,
          impact: 2, growth: 2, stability: 3, innovation: 1,
          frontend: 1, backend: 1, data: 3, infrastructure: 1,
          buildAI: 1, useAI: 2, analyzeData: 3, traditional: 2,
          visual: 1, algorithmic: 2, architecture: 1, fullstack: 1,
          handsOn: 2, structured: 3, community: 2, theory: 2,
          breakdown: 3, research: 3, experiment: 1, collaborate: 2,
          detective: 1, strategic: 2, necessary: 2, prevent: 1,
          satisfaction: 2, quality: 2, accuracy: 3, innovationMeasure: 1,
          active: 2, selective: 3, formal: 3, work: 2,
          expert: 2, leader: 2, fullstackExpert: 1, impactVision: 1,
          salary: 2, balance: 2, learning: 2, autonomy: 1,
          innovationCulture: 1, stable: 3, impactCulture: 1, creativeCulture: 1
        }
      },
      "Cloud Architect": {
        weights: {
          team: 2, mentor: 2, independent: 2, creative: 1,
          startup: 2, corporate: 3, remote: 3, hybrid: 3,
          pressure: 1, planner: 3, adaptive: 2, process: 2,
          impact: 1, growth: 2, stability: 3, innovation: 1,
          frontend: 1, backend: 1, data: 1, infrastructure: 3,
          buildAI: 1, useAI: 2, analyzeData: 2, traditional: 2,
          visual: 1, algorithmic: 1, architecture: 2, fullstack: 1,
          handsOn: 2, structured: 3, community: 2, theory: 2,
          breakdown: 2, research: 2, experiment: 1, collaborate: 2,
          detective: 1, strategic: 2, necessary: 2, prevent: 2,
          satisfaction: 1, quality: 2, accuracy: 2, innovationMeasure: 1,
          active: 1, selective: 2, formal: 3, work: 2,
          expert: 2, leader: 2, fullstackExpert: 2, impactVision: 1,
          salary: 2, balance: 2, learning: 2, autonomy: 1,
          innovationCulture: 1, stable: 3, impactCulture: 1, creativeCulture: 1
        }
      },
      "DevOps Engineer": {
        weights: {
          team: 3, mentor: 2, independent: 2, creative: 1,
          startup: 3, corporate: 2, remote: 3, hybrid: 3,
          pressure: 2, planner: 2, adaptive: 2, process: 2,
          impact: 1, growth: 2, stability: 2, innovation: 1,
          frontend: 1, backend: 2, data: 1, infrastructure: 3,
          buildAI: 1, useAI: 1, analyzeData: 1, traditional: 2,
          visual: 1, algorithmic: 1, architecture: 2, fullstack: 2,
          handsOn: 3, structured: 2, community: 2, theory: 1,
          breakdown: 2, research: 1, experiment: 2, collaborate: 2,
          detective: 1, strategic: 2, necessary: 2, prevent: 2,
          satisfaction: 1, quality: 2, accuracy: 1, innovationMeasure: 1,
          active: 1, selective: 1, formal: 2, work: 3,
          expert: 2, leader: 2, fullstackExpert: 2, impactVision: 1,
          salary: 1, balance: 1, learning: 1, autonomy: 2,
          innovationCulture: 1, stable: 2, impactCulture: 1, creativeCulture: 1
        }
      },
      "UI/UX Designer": {
        weights: {
          team: 2, mentor: 2, independent: 1, creative: 3,
          startup: 3, corporate: 1, remote: 3, hybrid: 2,
          pressure: 1, planner: 1, adaptive: 3, process: 1,
          impact: 3, growth: 2, stability: 1, innovation: 2,
          frontend: 2, backend: 1, data: 1, infrastructure: 1,
          buildAI: 1, useAI: 1, analyzeData: 1, traditional: 1,
          visual: 3, algorithmic: 1, architecture: 1, fullstack: 1,
          handsOn: 2, structured: 1, community: 2, theory: 1,
          breakdown: 1, research: 1, experiment: 2, collaborate: 3,
          detective: 1, strategic: 1, necessary: 1, prevent: 1,
          satisfaction: 3, quality: 1, accuracy: 1, innovationMeasure: 2,
          active: 3, selective: 1, formal: 1, work: 1,
          expert: 1, leader: 1, fullstackExpert: 1, impactVision: 2,
          salary: 1, balance: 2, learning: 1, autonomy: 2,
          innovationCulture: 2, stable: 1, impactCulture: 1, creativeCulture: 3
        }
      },
      "Product Manager": {
        weights: {
          team: 3, mentor: 3, independent: 1, creative: 2,
          startup: 3, corporate: 2, remote: 2, hybrid: 2,
          pressure: 2, planner: 3, adaptive: 2, process: 2,
          impact: 3, growth: 2, stability: 2, innovation: 2,
          frontend: 1, backend: 1, data: 1, infrastructure: 1,
          buildAI: 1, useAI: 1, analyzeData: 1, traditional: 1,
          visual: 1, algorithmic: 1, architecture: 1, fullstack: 1,
          handsOn: 2, structured: 2, community: 2, theory: 1,
          breakdown: 1, research: 1, experiment: 1, collaborate: 3,
          detective: 1, strategic: 1, necessary: 1, prevent: 1,
          satisfaction: 3, quality: 1, accuracy: 1, innovationMeasure: 1,
          active: 2, selective: 1, formal: 1, work: 2,
          expert: 1, leader: 3, fullstackExpert: 1, impactVision: 1,
          salary: 1, balance: 2, learning: 1, autonomy: 3,
          innovationCulture: 2, stable: 1, impactCulture: 1, creativeCulture: 1
        }
      }
    };

    // Calculate scores
    const scores = {};

    // Initialize scores for all careers
    Object.keys(careers).forEach(career => {
      scores[career] = 0;
    });

    // Add weights from answers
    Object.keys(answers).forEach(questionId => {
      const value = answers[questionId];
      console.log(`Processing question ${questionId}: value = ${value}`);

      Object.keys(careers).forEach(career => {
        if (careers[career].weights[value] !== undefined) {
          const weight = careers[career].weights[value];
          scores[career] += weight;
          console.log(`  Adding ${weight} to ${career} (now ${scores[career]})`);
        } else {
          console.log(`  No weight found for ${value} in ${career}`);
        }
      });
    });

    // Normalize to 0-100
    console.log('Raw scores:', scores);
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      Object.keys(scores).forEach(career => {
        scores[career] = Math.round((scores[career] / maxScore) * 100);
      });
    }
    console.log('Normalized scores:', scores);

    // Get top 3 careers
    const topCareers = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([career, score]) => ({
        career,
        score
      }));

    // Identify strengths from answers (copied from frontend career-test.js)
    const strengthMap = {
      team: "Collaboration and teamwork",
      mentor: "Learning from experienced professionals",
      independent: "Self-directed work and focus",
      creative: "Creative problem-solving and innovation",
      startup: "Adaptability in fast-paced environments",
      corporate: "Process-oriented and structured approach",
      remote: "Self-motivation and autonomy",
      hybrid: "Flexibility in work arrangements",
      pressure: "Thriving under pressure and deadlines",
      planner: "Strategic planning and foresight",
      adaptive: "Flexibility and adaptability",
      process: "Following established procedures",
      impact: "User-focused and impact-driven",
      growth: "Continuous learning and development",
      stability: "Seeking security and predictability",
      innovation: "Pursuing cutting-edge technology",
      frontend: "Visual design and user experience",
      backend: "Server-side logic and system architecture",
      data: "Data analysis and interpretation",
      infrastructure: "Systems and infrastructure management",
      buildAI: "AI system development and engineering",
      useAI: "Practical AI application integration",
      analyzeData: "Data pattern recognition and analysis",
      traditional: "Preference for established technologies",
      visual: "Visual thinking and design orientation",
      algorithmic: "Logical and algorithmic problem solving",
      architecture: "System design and architectural thinking",
      fullstack: "Comprehensive full-stack development",
      handsOn: "Learning by doing and experimentation",
      structured: "Preference for guided learning",
      community: "Collaborative and community-based learning",
      theory: "Deep theoretical understanding",
      breakdown: "Analytical problem decomposition",
      research: "Solution research and investigation",
      experiment: "Experimental approach to problem-solving",
      collaborate: "Collaborative problem-solving approach",
      detective: "Enjoyment of investigative debugging",
      strategic: "Strategic and tool-based debugging",
      necessary: "Pragmatic approach to necessary tasks",
      prevent: "Proactive bug prevention mindset",
      satisfaction: "User satisfaction as success metric",
      quality: "Code quality and technical excellence",
      accuracy: "Data precision and analytical accuracy",
      innovationMeasure: "Innovation as success measure",
      active: "Proactive trend following and learning",
      selective: "Focused and relevant learning approach",
      formal: "Preference for structured education",
      work: "Learning through practical work experience",
      expert: "Aspiration for deep technical expertise",
      leader: "Desire for leadership and team management",
      fullstackExpert: "Goal of full-stack mastery",
      impactVision: "Wanting to make significant impact",
      salary: "Value on financial compensation",
      balance: "Priority on work-life balance",
      learning: "Emphasis on continuous growth",
      autonomy: "Desire for independence and decision-making",
      innovationCulture: "Preference for innovative environments",
      stable: "Desire for stability and predictability",
      impactCulture: "Motivation by social impact",
      creativeCulture: "Value on creative freedom"
    };

    const strengths = [];
    const uniqueValues = new Set(Object.values(answers));

    uniqueValues.forEach(value => {
      if (strengthMap[value] && !strengths.includes(strengthMap[value])) {
        strengths.push(strengthMap[value]);
      }
    });

    // Return top 4 strengths
    const topStrengths = strengths.slice(0, 4);

    // Save or update career test results using Supabase
    const { error: upsertError } = await supabase
      .from('career_test')
      .upsert({
        userId: userId,
        answers: JSON.stringify(answers),
        topCareers: JSON.stringify(topCareers),
        strengths: JSON.stringify(topStrengths),
        completed: true
      }, { onConflict: ['userId'] });

    if (upsertError) {
      console.error('Error saving career test:', upsertError);
      return res.status(500).json({ error: 'Failed to save career test' });
    }

    // Update user's career goal with the top recommendation in public.users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ career_goal: topCareers[0].career })
      .eq('id', userId);

    if (updateError) {
      console.warn('Failed to update career goal:', updateError);
      // Don't fail the request for this
    }

    res.json({
      topCareers: topCareers,
      strengths: topStrengths
    });
  } catch (error) {
    console.error('Career test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET career test - get from Supabase
app.get('/api/career-test', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('career_test')
      .select('*')
      .eq('userId', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No career test found' });
    }

    const test = data[0];
    res.json({
      topCareers: JSON.parse(test.topCareers).map(item => item.career),
      strengths: JSON.parse(test.strengths),
      completed: Boolean(test.completed)
    });
  } catch (error) {
    console.error('Career test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard endpoint
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, career_goal')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get stats
    const { data: enrollData, error: enrollError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('userId', userId);

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return res.status(500).json({ error: 'Database error' });
    }

    const { data: certData, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('userId', userId);

    if (certError) {
      console.error('Error fetching certificates:', certError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get latest career test
    const { data: careerTestData, error: careerTestError } = await supabase
      .from('career_test')
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (careerTestError) {
      console.error('Error fetching career test:', careerTestError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Format response to match existing expectations
    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.full_name || userData.email.split('@')[0],
        careerGoal: userData.career_goal || 'undecided'
      },
      stats: {
        coursesEnrolled: enrollData.length || 0,
        overallProgress: enrollData.length > 0 ?
          Math.round(enrollData.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollData.length) : 0,
        streak: 0, // Simplified - would need more complex logic for real streak
        certificatesEarned: certData.length || 0
      },
      careerTest: careerTestData && careerTestData.length > 0 ? {
        completed: Boolean(careerTestData[0].completed),
        topCareers: JSON.parse(careerTestData[0].topCareers).map(item => item.career),
        strengths: JSON.parse(careerTestData[0].strengths),
        learningPath: 'Complete recommended courses to build your skills'
      } : null,
      enrollments: enrollData.map(enrollment => ({
        courseId: enrollment.course_id,
        courseName: enrollment.course_name,
        progress: enrollment.progress,
        completedHours: enrollment.completed_hours,
        totalHours: enrollment.total_hours,
        nextLessonTitle: enrollment.next_lesson_title || 'Next lesson'
      })),
      recentActivity: [] // Simplified for now
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Course endpoints
app.post('/api/enroll', authenticateToken, async (req, res) => {
  try {
    const { courseId, courseName, totalHours } = req.body;
    const userId = req.user.id;

    if (!courseId || !courseName) {
      return res.status(400).json({ error: 'Course ID and name are required' });
    }

    // Check if already enrolled
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('userId', userId)
      .eq('courseId', courseId);

    if (checkError) {
      console.error('Error checking enrollment:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingEnrollment && existingEnrollment.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Insert enrollment
    const { error: insertError } = await supabase
      .from('enrollments')
      .insert({
        userId: userId,
        courseId: courseId,
        courseName: courseName,
        totalHours: totalHours || 0
      });

    if (insertError) {
      console.error('Error inserting enrollment:', insertError);
      return res.status(500).json({ error: 'Failed to enroll in course' });
    }

    res.status(201).json({
      message: 'Successfully enrolled in course'
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
      .eq('userId', req.user.id)
      .order('enrolledAt', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      enrollments: data.map(enrollment => ({
        courseId: enrollment.courseId,
        courseName: enrollment.courseName,
        progress: enrollment.progress,
        completedHours: enrollment.completedHours,
        totalHours: enrollment.totalHours,
        nextLessonTitle: enrollment.nextLessonTitle || 'Next lesson',
        enrolledAt: enrollment.enrolledAt
      }))
    });
  } catch (error) {
    console.error('Enrollments error:', error);
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize database
  initializeDatabase();
});

module.exports = app;