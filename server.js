require("dotenv").config();

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.error("❌ Missing JWT_SECRET in .env — refusing to start with an undefined signing key.");
  process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./career_platform.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    careerGoal TEXT DEFAULT 'undecided',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS career_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    career TEXT,
    answers TEXT,
    courses TEXT,
    confidence INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    course TEXT,
    progress INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    course TEXT,
    cert_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    sender TEXT CHECK(sender IN ('user', 'bot')),
    response_text TEXT,
    response_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS oauth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    email TEXT,
    name TEXT,
    picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

});

// ==================== AUTH MIDDLEWARE ====================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, careerGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (name, email, password, careerGoal) VALUES (?, ?, ?, ?)',
      [name, email, hash, careerGoal || 'undecided'],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already registered' });
          }
          return res.status(500).json({ error: err.message });
        }

        const token = jwt.sign({ userId: this.lastID }, SECRET, { expiresIn: '7d' });
        res.status(201).json({
          success: true,
          token,
          user: { id: this.lastID, name, email, careerGoal: careerGoal || 'undecided' }
        });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, careerGoal: user.careerGoal }
    });
  });
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.get('SELECT id, name, email, careerGoal FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});
// Google stuffs
app.post("/api/auth/google", async (req, res) => {
    try {
        const { tokenId } = req.body;

        if (!tokenId) {
            return res.status(400).json({
                error: "Google token missing"
            });
        }

        // Verify token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const providerId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;

        if (!email) {
            return res.status(400).json({
                error: "Google account has no email."
            });
        }

        db.get(
            "SELECT * FROM users WHERE email = ?",
            [email],
            (err, user) => {

                if (err)
                    return res.status(500).json({
                        error: err.message
                    });

                // Existing user
                if (user) {

                    db.run(
                        `INSERT OR IGNORE INTO oauth_accounts
                        (user_id, provider, provider_id, email, name, picture)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            user.id,
                            "google",
                            providerId,
                            email,
                            name,
                            picture
                        ]
                    );

                    const token = jwt.sign(
                        {
                            userId: user.id
                        },
                        SECRET,
                        {
                            expiresIn: "7d"
                        }
                    );

                    return res.json({
                        success: true,
                        token,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            careerGoal: user.careerGoal
                        }
                    });

                }

                // New user
                db.run(
                    `INSERT INTO users
                    (name,email,password,careerGoal)
                    VALUES (?,?,?,?)`,
                    [
                        name,
                        email,
                        "",
                        "undecided"
                    ],
                    function (err) {

                        if (err)
                            return res.status(500).json({
                                error: err.message
                            });

                        const userId = this.lastID;

                        db.run(
                            `INSERT INTO oauth_accounts
                            (user_id,provider,provider_id,email,name,picture)
                            VALUES (?,?,?,?,?,?)`,
                            [
                                userId,
                                "google",
                                providerId,
                                email,
                                name,
                                picture
                            ]
                        );

                        const token = jwt.sign(
                            {
                                userId
                            },
                            SECRET,
                            {
                                expiresIn: "7d"
                            }
                        );

                        return res.status(201).json({
                            success: true,
                            token,
                            user: {
                                id: userId,
                                name,
                                email,
                                careerGoal: "undecided"
                            }
                        });

                    });

            });

    } catch (error) {

        console.error(error);

        return res.status(401).json({
            error: "Google authentication failed."
        });

    }
});
// ==================== CAREER TEST ALGORITHM (BACKEND) ====================

function calculateCareer(answers) {
  const weights = {
    'problem_solving': { 'AI/ML Engineer': 3, 'Data Scientist': 2, 'Software Developer': 1 },
    'creating':        { 'UI/UX Designer': 3, 'Frontend Developer': 1 },
    'analyzing':       { 'Data Scientist': 3, 'Data Analyst': 2 },
    'leading':         { 'Product Manager': 3 },
    'code':            { 'Software Developer': 3, 'AI/ML Engineer': 2 },
    'design':          { 'UI/UX Designer': 3 },
    'data':            { 'Data Analyst': 3, 'Data Scientist': 2 },
    'cloud':           { 'Cloud Architect': 3 },
    'tech':            { 'AI/ML Engineer': 3, 'Software Developer': 2 },
    'startup':         { 'Full Stack Developer': 3 },
    'finance':         { 'Data Scientist': 3 },
    'healthcare':      { 'Bioinformatics Specialist': 3 }
  };

  const scores = {};
  Object.values(answers).forEach(ans => {
    const w = weights[ans];
    if (w) {
      Object.entries(w).forEach(([career, weight]) => {
        scores[career] = (scores[career] || 0) + weight;
      });
    }
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

  const courseRecommendations = {
    'AI/ML Engineer': ['Python for Tech Careers', 'Data Structures & Algorithms', 'Advanced Machine Learning'],
    'Data Scientist': ['Data Analytics Basics', 'Python for Tech Careers', 'Data Structures & Algorithms'],
    'Software Developer': ['Python for Tech Careers', 'Web Development Fundamentals', 'Data Structures & Algorithms'],
    'UI/UX Designer': ['Web Development Fundamentals', 'User Experience Fundamentals', 'Design Systems'],
    'Data Analyst': ['Data Analytics Basics', 'Python for Tech Careers', 'SQL Mastery'],
    'Cloud Architect': ['Cloud Computing with AWS', 'DevOps Essentials', 'Web Development Fundamentals'],
    'Product Manager': ['Product Management Basics', 'Data Analytics Basics', 'Leadership Skills'],
    'Full Stack Developer': ['Web Development Fundamentals', 'Python for Tech Careers', 'Cloud Computing with AWS'],
    'Bioinformatics Specialist': ['Python for Tech Careers', 'Data Analytics Basics', 'Healthcare AI'],
    'Frontend Developer': ['Web Development Fundamentals', 'UI/UX Design', 'JavaScript Advanced']
  };

  const bestCareer = sorted[0]?.[0] || 'Software Developer';
  const confidence = Math.round((sorted[0]?.[1] || 0) / total * 100);

  return {
    career: bestCareer,
    confidence: confidence,
    allScores: sorted,
    courses: courseRecommendations[bestCareer] || ['Python for Tech Careers']
  };
}

// Submit career test
app.post('/api/career-test', authMiddleware, (req, res) => {
  const { answers } = req.body;
  const userId = req.userId;

  const result = calculateCareer(answers);

  db.run(`INSERT INTO career_tests (user_id, career, answers, courses, confidence)
          VALUES (?, ?, ?, ?, ?)`,
    [userId, result.career, JSON.stringify(answers), JSON.stringify(result.courses), result.confidence],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run('UPDATE users SET careerGoal = ? WHERE id = ?', [result.career, userId]);

      res.json({
        success: true,
        career: result.career,
        confidence: result.confidence,
        courses: result.courses,
        testId: this.lastID
      });
    });
});

// Get user's career test
app.get('/api/career-test', authMiddleware, (req, res) => {
  db.get('SELECT * FROM career_tests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [req.userId], (err, row) => {
      if (err || !row) return res.json({ career: null });
      res.json({
        career: row.career,
        confidence: row.confidence,
        answers: JSON.parse(row.answers),
        courses: JSON.parse(row.courses),
        date: row.created_at
      });
    });
});

// ==================== DASHBOARD ROUTES ====================

app.get('/api/dashboard', authMiddleware, (req, res) => {
  const userId = req.userId;

  db.get('SELECT id, name, email, careerGoal FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    db.get('SELECT * FROM career_tests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId], (err, career) => {

        db.all('SELECT * FROM enrollments WHERE user_id = ?', [userId], (err, courses) => {

          db.all('SELECT * FROM certificates WHERE user_id = ?', [userId], (err, certs) => {

            const progress = courses.length > 0
              ? Math.round(courses.reduce((s, c) => s + (c.progress || 0), 0) / courses.length)
              : 0;

            res.json({
              user: user,
              career: career || null,
              courses: courses || [],
              certificates: certs || [],
              progress: progress
            });
          });
        });
      });
  });
});

// ==================== COURSE ROUTES ====================

app.post('/api/enroll', authMiddleware, (req, res) => {
  const { course } = req.body;
  const userId = req.userId;

  db.run('INSERT INTO enrollments (user_id, course, progress) VALUES (?, ?, ?)',
    [userId, course, 0], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, enrollmentId: this.lastID });
    });
});

app.post('/api/progress', authMiddleware, (req, res) => {
  const { course, progress } = req.body;
  const userId = req.userId;

  db.run('UPDATE enrollments SET progress = ? WHERE user_id = ? AND course = ?',
    [progress, userId, course], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

app.get('/api/enrollments', authMiddleware, (req, res) => {
  db.all('SELECT * FROM enrollments WHERE user_id = ?', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==================== AI CHATBOT WITH DATABASE ====================

async function askGemini(userMessage, userName = "Student") {
    const prompt = `
You are CareerPath AI.

You are a professional AI career advisor.

You only recommend technology careers.

Keep answers concise.

Student:
${userName}

Question:
${userMessage}
`;

    const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });

    return result.text;
}

function generateAIResponse(userMessage, userName = 'User') {
  const lower = userMessage.toLowerCase();

  if (lower.includes('career') || lower.includes('path') || lower.includes('job')) {
    return {
      text: `Hi ${userName}! 🎯 Based on current trends, here are top careers:\n\n` +
            `• AI/ML Engineer - Highest demand & salary\n` +
            `• Data Scientist - Great growth potential\n` +
            `• Cloud Architect - Future-proof\n` +
            `• Full Stack Developer - Always in demand\n\n` +
            `Take our Career Test for a personalized recommendation! What interests you?`,
      type: 'career'
    };
  }

  if (lower.includes('course') || lower.includes('learn') || lower.includes('python') || lower.includes('java')) {
    return {
      text: `📚 Great question! I recommend this learning path:\n\n` +
            `1️⃣ Python for Tech Careers (4 weeks) - START HERE\n` +
            `2️⃣ Data Structures & Algorithms (6 weeks)\n` +
            `3️⃣ Web Development OR AI/ML (based on interest)\n\n` +
            `All courses are FREE! Start with Python. Would you like to enroll?`,
      type: 'learning'
    };
  }

  if (lower.includes('resume') || lower.includes('cv') || lower.includes('portfolio')) {
    return {
      text: `📝 Resume Tips for Tech Roles:\n\n` +
            `✅ Use ACTION VERBS: "Developed", "Optimized", "Designed"\n` +
            `✅ QUANTIFY achievements: "Improved by 40%", "Served 10k users"\n` +
            `✅ Add PROJECTS: GitHub links, portfolio pieces\n` +
            `✅ Keep to 1 PAGE (entry-level) or 2 (senior)\n` +
            `✅ Customize for each job\n\n` +
            `Want specific feedback? Share a role you're targeting!`,
      type: 'career_advice'
    };
  }

  if (lower.includes('interview') || lower.includes('prepare') || lower.includes('question')) {
    return {
      text: `🎤 Interview Preparation Tips:\n\n` +
            `📌 Common Questions:\n` +
            `1. "Tell me about yourself" - Keep it 60 seconds\n` +
            `2. "Why this role?" - Research the company\n` +
            `3. "Describe a challenge" - Use STAR method\n\n` +
            `📌 STAR Method (Situation, Task, Action, Result):\n` +
            `S: What was the context?\n` +
            `T: What did you need to do?\n` +
            `A: What specific actions did you take?\n` +
            `R: What was the result?\n\n` +
            `Practice mock interviews! Good luck! 💪`,
      type: 'interview_prep'
    };
  }

  if (lower.includes('salary') || lower.includes('pay') || lower.includes('compensation') || lower.includes('money')) {
    return {
      text: `💰 Tech Salaries in India (2025):\n\n` +
            `Entry-Level (0-2 yrs):\n` +
            `• Software Developer: ₹3-5 LPA\n` +
            `• Data Analyst: ₹3-4 LPA\n\n` +
            `Mid-Level (2-5 yrs):\n` +
            `• Senior Developer: ₹6-10 LPA\n` +
            `• AI/ML Engineer: ₹7-12 LPA\n` +
            `• Data Scientist: ₹7-12 LPA\n\n` +
            `Note: Varies by company, location, skills. Negotiate based on experience!`,
      type: 'salary_info'
    };
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return {
      text: `👋 Hi ${userName}! Welcome to CareerPath AI! 🚀\n\n` +
            `I can help you with:\n` +
            `🎯 Career advice & paths\n` +
            `📚 Course recommendations\n` +
            `📝 Resume tips\n` +
            `🎤 Interview preparation\n` +
            `💰 Salary information\n\n` +
            `What would you like to explore?`,
      type: 'greeting'
    };
  }

  if (lower.includes('help') || lower.includes('what can you do') || lower.includes('features')) {
    return {
      text: `🤖 Here's what I can help with:\n\n` +
            `1. Career guidance - Get recommendations\n` +
            `2. Course suggestions - Find your path\n` +
            `3. Resume writing - Polish your CV\n` +
            `4. Interview prep - Practice questions\n` +
            `5. Tech tips - Learn best practices\n\n` +
            `Try asking: "What career suits me?" or "Best Python course?"`,
      type: 'help'
    };
  }

  return {
    text: `That's an interesting question! 🤔\n\n` +
          `I specialize in:\n` +
          `• Career recommendations\n` +
          `• Course guidance\n` +
          `• Resume tips\n` +
          `• Interview preparation\n\n` +
          `Try taking our Career Test for personalized guidance!`,
    type: 'general'
  };
}

// Single, canonical /api/ai/chat handler: Gemini first, offline fallback on failure.
app.post("/api/ai/chat", authMiddleware, async (req, res) => {
    const { message } = req.body;
    const userId = req.userId;

    if (!message || message.trim() === "") {
        return res.status(400).json({ error: "Message cannot be empty" });
    }

    db.get("SELECT name FROM users WHERE id = ?", [userId], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const userName = user?.name || "Student";

        let reply;
        let source;

        try {
            reply = await askGemini(message, userName);
            source = "gemini";
        } catch (error) {
            console.error("Gemini Error:", error);
            const fallback = generateAIResponse(message, userName);
            reply = fallback.text;
            source = "offline";
        }

        db.run(
            `INSERT INTO chat_history (user_id, message, sender, response_text) VALUES (?, ?, ?, ?)`,
            [userId, message, "user", reply],
            function(saveErr) {
                if (saveErr) {
                    console.error(saveErr);
                }
                res.json({ reply, source, saved: !saveErr });
            }
        );
    });
});

app.get('/api/chat/history', authMiddleware, (req, res) => {
  db.all(`SELECT message, response_text, sender, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
});

app.delete('/api/chat/clear', authMiddleware, (req, res) => {
  db.run('DELETE FROM chat_history WHERE user_id = ? AND id NOT IN (SELECT id FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50)',
    [req.userId, req.userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`✅ CareerPath AI Server running at http://localhost:${PORT}`);
  console.log(`📁 Database: career_platform.db`);
  console.log(`🔐 JWT auth configured`);
});
