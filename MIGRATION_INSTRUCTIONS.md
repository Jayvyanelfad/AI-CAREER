# Database Foundation Phase 1 - Migration Instructions

## Overview
This phase creates the database foundation for the CareerPath AI application using Supabase. The migration is **ADDITIVE** - it only adds new tables and preserves all existing data.

## Prerequisites
1. Supabase project is accessible (verified in previous steps)
2. Node.js is installed
3. You have the Supabase URL and Service Role Key in your `.env` file

## Migration Files

### 1. Schema Migration SQL
**File**: `migrate_database_foundation.sql`
**Purpose**: Creates all required tables and enables RLS
**Location**: Supabase SQL Editor

### 2. Data Migration Script\
**File**: `migrate-course-data.js`
**Purpose**: Migrates course data from public/courses.js to courses table
**Execution**: Node.js

### 3. Verification Script
**File**: `verify-migration.js`
**Purpose**: Checks that migration was successful
**Execution**: Node.js (after both migrations)

## Step-by-Step Instructions

### STEP 1: Execute Schema Migration
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `migrate_database_foundation.sql`
5. Paste into the SQL editor
6. Click **RUN**

**Expected Output**: Success messages indicating tables were created

### STEP 2: Execute Data Migration
1. Open terminal in the project directory
2. Run: `node migrate-course-data.js`
3. Wait for completion

**Expected Output**:
- "Found 12 courses in public/courses.js"
- "Course insertion completed. Success: 12, Errors: 0"
- "Total courses in table: 12"
- "IDs match? true"

### STEP 3: Verify Migration
1. Run: `node verify-migration.js`
2. Review the output for any errors

**Expected Output**:
- All tables show ✅ with correct row counts
- Course IDs match expected values
- Preserved tables still exist and have data
- RLS appears to be enabled on user-specific tables

## Troubleshooting

### "Could not find the table" errors
- **Cause**: Trying to run data migration before schema migration
- **Solution**: Ensure you've completed STEP 1 before STEP 2

### "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" errors
- **Cause**: Environment variables not set
- **Solution**: Check your `.env` file contains:
  ```
  SUPABASE_URL=your_project_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

### Permission errors
- **Cause**: Using anon key instead of service role key
- **Solution**: Ensure you're using the SUPABASE_SERVICE_ROLE_KEY for migration scripts

## Post-Migration Verification Checklist

After running both migration scripts and verification:

### Database Structure
- [ ] 10 new tables created: courses, modules, lessons, lesson_progress, exams, exam_questions, exam_options, exam_attempts, exam_answers, career_test_attempts
- [ ] All existing tables preserved: users, career_test, enrollments, certificates, chat_history, user_activity, oauth_accounts, questions, question_options
- [ ] Courses table contains exactly 12 rows
- [ ] Course IDs match those in public/courses.js exactly

### Data Integrity
- [ ] Course titles, descriptions, images match source data
- [ ] Badge values correctly mapped to difficulty (beginner/intermediate/advanced)
- [ ] Week and level values preserved
- [ ] No corruption in existing table data

### Security
- [ ] Row Level Security enabled on user-specific tables
- [ ] Policies created for user data access control
- [ ] exam_options.is_correct column exists (will be hidden from frontend)
- [ ] Service role key not exposed in any frontend code

### Backend Readiness
- [ ] server.js starts without errors
- [ ] Existing authentication endpoints functional
- [ ] New database schema ready for API implementation

## Files Created for This Phase
- `migrate_database_foundation.sql` - Schema creation SQL
- `migrate-course-data.js` - Course data migration script\
- `verify-migration.js` - Migration verification script
- `PHASE_1_DATABASE_IMPLEMENTATION.md` - Detailed implementation document
- `MIGRATION_INSTRUCTIONS.md` - This instruction file

## Important Notes
- **NO DESTRUCTIVE CHANGES**: This migration only ADDS tables, never modifies or removes existing ones
- **DATA PRESERVATION**: All existing table data is completely preserved
- **BACKWARD COMPATIBLE**: Existing career_test table is preserved for compatibility
- **IDEMPOTENT SAFE**: Scripts can be run multiple times without negative effects
- **FRONTEND UNCHANGED**: No modifications to existing frontend code in this phase

## Need Help?
If you encounter issues:
1. Double-check you completed STEP 1 before STEP 2
2. Verify your .env file contains correct Supabase credentials
3. Check the Supabase SQL Editor for any execution errors
4. Review the verification script output for specific failure points