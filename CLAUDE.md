# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Career Guidance Platform with Gemini - a full-stack web application that helps students discover tech career paths through AI-powered assessments and provides free learning resources.

## Tech Stack

**Frontend:**
- Vanilla HTML/CSS/JavaScript (no frameworks)
- Custom CSS design system inspired by Bellhatria (dark green palette, elegant typography)
- Responsive design with mobile-first breakpoints

**Backend:**
- Node.js with Express.js
- SQLite database (career_platform.db)
- JWT authentication
- Google Gemini AI integration (@google/genai)
- Google OAuth authentication
- Password hashing with bcryptjs

**Key Features:**
- User authentication (email/password, Google OAuth)
- AI-powered career assessment test
- Course enrollment and progress tracking
- Dashboard for viewing progress and certificates
- AI chatbot career mentor (Gemini-powered)
- Free tech career courses (Python, Data Structures, Web Development, etc.)

## Development Setup

1. **Prerequisites:**
   - Node.js 20.x (see .nvmrc)
   - npm package manager
   - Gemini API key (in .env file)

2. **Setup:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file with:
   ```
   NODE_ENV=development
   PORT=5000
   JWT_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. **Run the application:**
   ```bash
   npm start
   ```
   Server runs on http://localhost:5000

## Project Structure

```
/ (root)
├── server.js              # Main Express server
├── career_platform.db     # SQLite database
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (not in repo)
├── .nvmrc                # Node version specification
└── /public               # Static frontend files
    ├── index.html        # Homepage
    ├── career-test.html  # Career assessment
    ├── dashboard.html    # User dashboard
    ├── courses.html      # Course catalog
    ├── login.html        # Login page
    ├── register.html     # Registration page
    ├── styles.css        # Main stylesheet (design system)
    ├── career-test.js    # Career test logic
    ├── chatbot.js        # Chatbot functionality
    └── theme.js          # Dark/light theme toggle
```

## Key Implementation Details

### Database Schema
- `users`: User profiles with email, hashed password, career goal
- `career_test`: Stores assessment results and recommendations
- `enrollments`: Tracks user course enrollment and progress
- `certificates`: Stores earned certificates
- `chat_history`: Persists AI chatbot conversations
- `oauth_accounts`: Tracks Google OAuth connections

### Career Test Algorithm
Located in `server.js` (`calculateCareer` function):
- Uses weighted scoring based on answers to 4 questions
- Maps to 8 possible tech careers: AI/ML Engineer, Data Scientist, Software Developer, UI/UX Designer, Data Analyst, Cloud Architect, Product Manager, Full Stack Developer
- Returns recommended career, confidence percentage, and suggested courses

### Authentication Flow
- JWT-based session management
- Password hashing with bcryptjs (salt rounds: 10)
- Google OAuth integration via `/api/auth/google` endpoint
- Protected routes use `authMiddleware` to verify tokens

### Styling & Design System
- CSS custom properties (CSS variables) in `:root` for design tokens
- Bellhatria-inspired luxury aesthetic with dark green (#0d2b21) and beige (#ead2bf) palette
- Responsive design with mobile breakpoints at 991px, 767px, and 480px
- Custom CSS classes for typography (.text-h1, .text-h2, etc.), spacing (.space-1 through .space-24), and components
- Smooth transitions and hover effects throughout

### API Endpoints
**Authentication:**
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user
- POST `/api/auth/google` - Google OAuth

**Career Test:**
- POST `/api/career-test` - Submit career assessment (auth required)
- GET `/api/career-test` - Get user's latest test results (auth required)

**Dashboard:**
- GET `/api/dashboard` - Get user dashboard data (auth required)

**Courses:**
- POST `/api/enroll` - Enroll in a course (auth required)
- POST `/api/progress` - Update course progress (auth required)
- GET `/api/enrollments` - Get user's enrollments (auth required)

**AI Chatbot:**
- POST `/api/ai/chat` - Send message to AI mentor (auth required)
- GET `/api/chat/history` - Get chat history (auth required)
- DELETE `/api/chat/clear` - Clear chat history (auth required)

## Development Guidelines

### When Modifying Frontend:
- Maintain consistency with the design system in `/public/styles.css`
- Use CSS variables for colors, spacing, typography
- Follow existing patterns for responsiveness
- Keep JavaScript modular and concise
- Ensure all pages link to the same stylesheet

### When Modifying Backend:
- Follow existing patterns in `server.js`
- Use parameterized queries to prevent SQL injection
- Validate all inputs before processing
- Handle errors gracefully with appropriate HTTP status codes
- Keep authentication middleware consistent
- Close database connections properly (though SQLite handles this)

### Database Changes:
- Modify table schemas in the `db.serialize()` section of `server.js`
- Remember to increment version numbers if adding migration logic
- Backup the database before making structural changes

### Environment & Security:
- Never commit `.env` file - it contains sensitive keys
- Use environment variables for all secrets
- Validate JWT tokens on all protected routes
- Hash passwords before storage (never store plaintext)

## Common Tasks

### Adding a New Course:
1. Add course information to `courses.html` and the courses grid
2. Add course recommendation logic to `calculateCareer()` in `server.js` if needed
3. Update course recommendations in the career test results mapping
4. Ensure course name matches exactly in enrollments table

### Modifying Career Test:
1. Update questions in `/public/career-test.html`
2. Update answer processing in `/public/career-test.js`
3. Update the `weights` object in `calculateCareer()` function in `server.js`
4. Update course recommendations mapping in `calculateCareer()`

### Styling Changes:
1. Modify variables in `:root` section of `/public/styles.css` for global changes
2. Add new utility classes as needed following existing patterns
3. Ensure responsive breakpoints work correctly
4. Test dark/light mode toggle functionality

## Important Files to Reference

- **package.json**: Project dependencies and scripts
- **server.js**: Main application logic, API routes, database setup
- **public/styles.css**: Complete design system and styling
- **public/career-test.html/js**: Career assessment implementation
- **.env.example** (create this): Template for environment variables
- **README.md**: Project overview (if exists)

## Troubleshooting

### Database Issues:
- Ensure `career_platform.db` has read/write permissions
- Check console for SQLite error messages
- Verify table schemas match expectations

### Authentication Problems:
- Verify JWT_SECRET matches in .env and server.js
- Check that tokens are being stored/sent correctly
- Ensure bcryptjs is properly installed

### API Connection Issues:
- Verify CORS middleware is configured correctly
- Check that frontend is calling correct backend URL (localhost:5000)
- Confirm Gemini API key is valid and has sufficient quota

### Styling Inconsistencies:
- Clear browser cache when testing CSS changes
- Verify CSS specificity isn't being overridden
- Check responsive breakpoints with browser dev tools

This application follows a straightforward MVC-like pattern with Express handling routes, direct SQL queries for data access, and vanilla JavaScript for frontend interactivity. The design system is intentionally cohesive and luxurious, focusing on a premium feel for an educational platform.