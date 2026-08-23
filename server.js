// CUSTOM IDENTIFIER TO VERIFY WHICH FILE IS LOADING - CAREER TEST FIX ATTEMPT
console.log('SERVER STARTING - LOADED SERVER.JS');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
const { GoogleGenAI } = require('@google/genai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Database setup
const db = new sqlite3.Database('./career_platform.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Google OAuth client
const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // For frontend communication
);

// Gemini AI setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Authentication middleware
function authenticateToken(req, res, next) {
  console.log('AUTH MIDDLEWARE: Checking token');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('AUTH MIDDLEWARE: authHeader=', authHeader);
  console.log('AUTH MIDDLEWARE: token=', token ? 'present' : 'missing');

  if (!token) {
    console.log('AUTH MIDDLEWARE: No token, returning 401');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    console.log('AUTH MIDDLEWARE: JWT verify callback, err=', err);
    if (err) {
      console.log('AUTH MIDDLEWARE: Invalid token, returning 403');
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('AUTH MIDDLEWARE: Token valid, setting req.user and calling next');
    req.user = user;
    next();
  });
}

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT,
        careerGoal TEXT DEFAULT 'undecided',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Career test results table
    db.run(`
      CREATE TABLE IF NOT EXISTS career_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        answers TEXT,
        topCareers TEXT,
        strengths TEXT,
        completed BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Enrollments table
    db.run(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        courseId TEXT,
        courseName TEXT,
        progress INTEGER DEFAULT 0,
        completedHours INTEGER DEFAULT 0,
        totalHours INTEGER DEFAULT 0,
        nextLessonTitle TEXT,
        enrolledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Certificates table
    db.run(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        courseId TEXT,
        courseName TEXT,
        earnedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Chat history table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        message TEXT,
        response TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // OAuth accounts table
    db.run(`
      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        provider TEXT NOT NULL,
        providerId TEXT NOT NULL,
        accessToken TEXT,
        refreshToken TEXT,
        expiresAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        UNIQUE(provider, providerId)
      )
    `);
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
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

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      db.run(
        'INSERT INTO users (email, password, name, careerGoal) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, goal],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          // Generate JWT token
          const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, {
            expiresIn: '7d'
          });

          res.status(201).json({
            token,
            user: { id: this.lastID, email, name, careerGoal: goal }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    db.get('SELECT id, email, password, name FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
        expiresIn: '7d'
      });

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, careerGoal: user.careerGoal }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  // Get user data without password
  db.get(
    'SELECT id, email, name, careerGoal FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    }
  );
});

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential required' });
    }

    // Verify Google token
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    db.get('SELECT id, email, name FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (user) {
        // User exists, generate token
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
          expiresIn: '7d'
        });

        res.json({
          token,
          user: { id: user.id, email: user.email, name: user.name, careerGoal: user.careerGoal }
        });
      } else {
        // Create new user
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        db.run(
          'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
          [email, hashedPassword, name],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create user' });
            }

            const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, {
              expiresIn: '7d'
            });

            res.json({
              token,
              user: { id: this.lastID, email, name, careerGoal: 'undecided' }
            });
          }
        );
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Career test endpoints
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

    // Career database with scoring weights (copied from frontend career-test.js)
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

    // Save or update career test results
    db.run(
      `INSERT OR REPLACE INTO career_test
       (userId, answers, topCareers, strengths, completed)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(answers),
        JSON.stringify(topCareers),
        JSON.stringify(topStrengths),
        1
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save career test' });
        }

        // Update user's career goal with the top recommendation
        db.run(
          'UPDATE users SET careerGoal = ? WHERE id = ?',
          [topCareers[0].career, userId],
          (err) => {
            if (err) {
              console.warn('Failed to update career goal:', err);
            }
          }
        );

        res.json({
          topCareers: topCareers,
          strengths: topStrengths
        });
      }
    );
  } catch (error) {
    console.error('Career test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/career-test', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM career_test WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
    [req.user.id],
    (err, test) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!test) {
        return res.status(404).json({ error: 'No career test found' });
      }

      res.json({
        topCareers: JSON.parse(test.topCareers),
        strengths: JSON.parse(test.strengths),
        completed: Boolean(test.completed)
      });
    }
  );
});

// Dashboard endpoint
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const userId = req.user.id;

  // Get user data
  db.get(
    'SELECT id, email, name, careerGoal FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get stats
      db.all(
        'SELECT COUNT(*) as coursesEnrolled FROM enrollments WHERE userId = ?',
        [userId],
        (err, enrollResult) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          db.all(
            'SELECT AVG(progress) as overallProgress FROM enrollments WHERE userId = ?',
            [userId],
            (err, progressResult) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              db.all(
                'SELECT COUNT(*) as certificatesEarned FROM certificates WHERE userId = ?',
                [userId],
                (err, certResult) => {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }

                  // Get latest career test
                  db.get(
                    'SELECT * FROM career_test WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
                    [userId],
                    (err, careerTest) => {
                      if (err) {
                        return res.status(500).json({ error: 'Database error' });
                      }

                      // Get enrollments
                      db.all(
                        'SELECT * FROM enrollments WHERE userId = ? ORDER BY enrolledAt DESC',
                        [userId],
                        (err, enrollments) => {
                          if (err) {
                            return res.status(500).json({ error: 'Database error' });
                          }

                          res.json({
                            user: {
                              id: user.id,
                              email: user.email,
                              name: user.name,
                              careerGoal: user.careerGoal || 'undecided'
                            },
                            stats: {
                              coursesEnrolled: enrollResult[0].coursesEnrolled || 0,
                              overallProgress: Math.round(progressResult[0].overallProgress || 0),
                              streak: 0, // Would need more complex logic
                              certificatesEarned: certResult[0].certificatesEarned || 0
                            },
                            careerTest: careerTest ? {
                              completed: Boolean(careerTest.completed),
                              topCareers: JSON.parse(careerTest.topCareers).map(item => item.career),
                              strengths: JSON.parse(careerTest.strengths),
                              learningPath: 'Complete recommended courses to build your skills'
                            } : null,
                            enrollments: enrollments.map(enrollment => ({
                              courseId: enrollment.courseId,
                              courseName: enrollment.courseName,
                              progress: enrollment.progress,
                              completedHours: enrollment.completedHours,
                              totalHours: enrollment.totalHours,
                              nextLessonTitle: enrollment.nextLessonTitle || 'Next lesson'
                            })),
                            recentActivity: [] // Simplified
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Course endpoints
app.post('/api/enroll', authenticateToken, (req, res) => {
  try {
    const { courseId, courseName, totalHours } = req.body;
    const userId = req.user.id;

    if (!courseId || !courseName) {
      return res.status(400).json({ error: 'Course ID and name are required' });
    }

    // Check if already enrolled
    db.get(
      'SELECT id FROM enrollments WHERE userId = ? AND courseId = ?',
      [userId, courseId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
          return res.status(400).json({ error: 'Already enrolled in this course' });
        }

        // Insert enrollment
        db.run(
          'INSERT INTO enrollments (userId, courseId, courseName, totalHours) VALUES (?, ?, ?, ?)',
          [userId, courseId, courseName, totalHours || 0],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to enroll in course' });
            }

            res.status(201).json({
              message: 'Successfully enrolled in course',
              enrollmentId: this.lastID
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/progress', authenticateToken, (req, res) => {
  try {
    const { enrollmentId, progress, completedHours } = req.body;

    if (enrollmentId === undefined || progress === undefined) {
      return res.status(400).json({ error: 'Enrollment ID and progress are required' });
    }

    // Update progress
    db.run(
      'UPDATE enrollments SET progress = ?, completedHours = ? WHERE id = ? AND userId = ?',
      [progress, completedHours || 0, enrollmentId, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update progress' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Enrollment not found' });
        }

        res.json({ message: 'Progress updated successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/enrollments', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM enrollments WHERE userId = ? ORDER BY enrolledAt DESC',
    [req.user.id],
    (err, enrollments) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        enrollments: enrollments.map(enrollment => ({
          courseId: enrollment.courseId,
          courseName: enrollment.courseName,
          progress: enrollment.progress,
          completedHours: enrollment.completedHours,
          totalHours: enrollment.totalHours,
          nextLessonTitle: enrollment.nextLessonTitle || 'Next lesson',
          enrolledAt: enrollment.enrolledAt
        }))
      });
    }
  );
});

// AI Chatbot endpoints
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

    // Save chat history
    db.run(
      'INSERT INTO chat_history (userId, message, response) VALUES (?, ?, ?)',
      [userId, message, text],
      function(err) {
        if (err) {
          console.warn('Failed to save chat history:', err);
        }
      }
    );

    res.json({ reply: text });
  } catch (error) {
    console.error('AI chat error:', error);
    if ((error.error && error.error.code === 429) || error.status === 429) {
      return res.status(503).json({ error: 'AI service temporarily unavailable due to quota exceeded. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

app.get('/api/chat/history', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM chat_history WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
    [req.user.id],
    (err, chats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        history: chats.map(chat => ({
          message: chat.message,
          response: chat.response,
          timestamp: chat.createdAt
        }))
      });
    }
  );
});

app.delete('/api/chat/clear', authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM chat_history WHERE userId = ?',
    [req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to clear chat history' });
      }

      res.json({ message: 'Chat history cleared' });
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize database
  initializeDatabase();
});

module.exports = app;

