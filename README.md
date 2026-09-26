# AI Career Guidance Platform

## Essential Files

### Backend
- `server.js` - Main Express server with Supabase integration
- `package.json` - Dependencies and scripts
- `package-lock.json` - Locked dependency versions
- `.env` - Environment variables (contains secrets, not committed)
- `.env.example` - Template for environment variables
- `SUPABASE_MIGRATION_FIXED.sql` - Database migration script

### Frontend (public/)
- `index.html` - Homepage
- `login.html` - Login page
- `register.html` - Registration page
- `dashboard.html` - User dashboard
- `career-test.html` - Career assessment test
- `courses.html` - Course catalog
- `profile.html` - User profile
- `contactus.html` - Contact page
- `styles.css` - Main stylesheet
- `theme.js` - Dark/light theme toggle
- `supabase-config.js` - Supabase configuration
- `login.js`, `register.js`, `dashboard.js`, `career-test.js`, `profile.js`, `courses.js`, `auth-callback.js` - Page-specific JavaScript

## Setup
1. Install dependencies: `npm install`
2. Create `.env` file from `.env.example`
3. Get Supabase URL and service role key from Supabase dashboard
4. Get Gemini API key from Google AI Studio
5. Run: `npm start`
6. Visit: `http://localhost:5000`

## Database
Run the migration script in your Supabase database:
```bash
psql -h [your-host] -U [your-user] -d [your-db] -f SUPABASE_MIGRATION_FIXED.sql
```
