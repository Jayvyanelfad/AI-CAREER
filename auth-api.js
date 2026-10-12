// Registration and registration-repair API. Auth users live in Supabase Auth;
// profile rows live in public.users. The two writes cannot share a database
// transaction, so partial registration is reported honestly (profileComplete)
// and repaired idempotently via complete-registration, which only fills
// missing values and never overwrites user-edited fields.
const express = require('express');

function createAuthRouter({ supabase, authenticateToken, createAuthClient, getAuthCallbackUrl }) {
  const router = express.Router();

  // Auth endpoints
  router.post('/auth/register', async (req, res) => {
    try {
      const { email, password, name, careerGoal } = req.body || {};
      const authClient = createAuthClient();

      if (typeof email !== 'string' || typeof password !== 'string' ||
          typeof name !== 'string' || !email.trim() || !password || !name.trim()) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      // Use provided careerGoal or default to 'undecided'
      const goal = careerGoal || 'undecided';

      // Register user with Supabase Auth
      const { data, error } = await authClient.auth.signUp({
        email: email.trim(),
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
        const message = String(error.message || '').toLowerCase();
        if (/already registered|already exists/.test(message)) {
          return res.status(400).json({ error: 'User already exists' });
        }
        if (/rate limit|too many requests/.test(message)) {
          return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
        }
        if (/email/.test(message)) return res.status(400).json({ error: 'A valid email address is required' });
        if (/password/.test(message)) return res.status(400).json({ error: 'Password does not meet the account requirements' });
        console.error('Registration provider error:', error.status || error.code || 'unknown error');
        return res.status(Number(error.status) >= 500 ? 503 : 400).json({ error: 'Could not create account' });
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

      // A duplicate row means a retry of an earlier attempt: the profile already
      // exists, so registration can proceed. Any other failure leaves an Auth
      // user without a profile row; report it honestly so the client repairs it
      // via complete-registration instead of silently claiming completion.
      let profileComplete = true;
      if (metadataError) {
        if (metadataError.code !== '23505') {
          console.error('Error inserting user metadata:', metadataError);
          profileComplete = false;
        }
      }

      // Try to create a session immediately (if email confirmation is not required)
      const { data: sessionData, error: sessionError } = await authClient.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (sessionError) {
        // If we can't create session immediately (e.g., email confirmation required),
        // still return success but without token - frontend should handle this
        return res.status(201).json({
          message: 'User created successfully. Please check your email to confirm your account.',
          profileComplete,
          user: { id: user.id, email: user.email, name, careerGoal: goal }
        });
      }

      const { session } = sessionData;

      res.status(201).json({
        token: session.access_token,
        refresh_token: session.refresh_token,
        profileComplete,
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

  // Create or repair the application's profile row after browser-side signup or
  // email confirmation. The authenticated Supabase user is the source of truth.
  // Safe to retry: missing rows are inserted, rows with missing values are
  // repaired, complete rows are untouched, and concurrent inserts resolve to
  // success via the primary-key conflict.
  router.post('/auth/complete-registration', authenticateToken, async (req, res) => {
    try {
      const { data: existing, error: readError } = await supabase
        .from('users')
        .select('id, full_name, career_goal')
        .eq('id', req.user.id)
        .maybeSingle();

      if (readError) {
        console.error('Error reading registration profile:', readError);
        return res.status(500).json({ error: 'Could not complete account setup' });
      }

      if (!existing) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: req.user.id,
            full_name: req.user.name,
            career_goal: req.user.careerGoal || 'undecided'
          });
        if (insertError) {
          // A concurrent retry already inserted the row: treat as success.
          if (insertError.code === '23505') return res.status(204).end();
          console.error('Error completing registration profile:', insertError);
          return res.status(500).json({ error: 'Could not complete account setup' });
        }
        return res.status(204).end();
      }

      // Repair only missing values; never overwrite fields the user may have
      // edited since signup.
      const repair = {};
      if ((existing.full_name === null || existing.full_name === undefined) && req.user.name) {
        repair.full_name = req.user.name;
      }
      if ((existing.career_goal === null || existing.career_goal === undefined)) {
        repair.career_goal = req.user.careerGoal || 'undecided';
      }
      if (Object.keys(repair).length > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update(repair)
          .eq('id', req.user.id);
        if (updateError) {
          console.error('Error repairing registration profile:', updateError);
          return res.status(500).json({ error: 'Could not complete account setup' });
        }
      }

      return res.status(204).end();
    } catch (error) {
      console.error('Error completing registration profile:', error);
      return res.status(500).json({ error: 'Could not complete account setup' });
    }
  });

  return router;
}

module.exports = { createAuthRouter };
