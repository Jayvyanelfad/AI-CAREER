// ============================================================
// Shared Supabase connection — used by login.js, register.js,
// dashboard.js, profile.js, and auth-callback.js
//
// SETUP: Get these two values from Supabase Dashboard > Project Settings > API
//   - Project URL          -> SUPABASE_URL
//   - anon / public key    -> SUPABASE_ANON_KEY
// The anon key is safe to put in frontend code (unlike the service_role key).
// ============================================================
// FIXED: Corrected Supabase URL (was missing an 'i')
const SUPABASE_URL = "https://bfjkjiizmlsbfszyhxfe.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmamtqaWl6bWxzYmZzenloeGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTY4OTgsImV4cCI6MjEwMjAzMjg5OH0.fIaE9Voe5bsXV-z-2UV0-DL4xwdpvOWVwRk_-KDprew";

// Function to initialize Supabase client when the global is available
function initSupabaseClient() {
  // Check if supabase global is available (from the CDN script)
  if (window.supabase) {
    // Create Supabase client and attach to window for global access
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized successfully');

    // Also set up the API base
    window.API_BASE = "/api";
    return true;
  } else {
    console.log('⏳ Waiting for supabase global to be available...');
    return false;
  }
}

// Initialize immediately, and if not ready, wait and try again
if (!initSupabaseClient()) {
  // Poll for supabase availability (with timeout)
  let attempts = 0;
  const maxAttempts = 30; // 3 seconds max wait
  const checkInterval = setInterval(() => {
    if (initSupabaseClient() || attempts >= maxAttempts) {
      clearInterval(checkInterval);
      if (attempts >= maxAttempts) {
        console.error('❌ Failed to initialize Supabase client after timeout');
      }
    }
    attempts++;
  }, 100);
}