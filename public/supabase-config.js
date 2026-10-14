// ============================================================
// Shared Supabase connection — used by login.js, register.js,
// dashboard.js, profile.js, and auth-callback.js
//
// SETUP: Get these two values from Supabase Dashboard > Project Settings > API
//   - Project URL          -> SUPABASE_URL
//   - Publishable API key  -> obtained from Supabase Project Settings > API
// Only a public/publishable key belongs in the browser; never expose service_role.
// ============================================================
// FIXED: Corrected Supabase URL (was missing an 'i')
const SUPABASE_URL = "https://bfjkjiizmlsbfszyhxfe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_i5n21yJ7e4egEHfBfFeokg_-ALYlAT0";

// Mirror Auth state into an HttpOnly cookie for server-side page gates.
// Supabase continues to own token refresh in the browser.
let careerPathCookieSyncChain = Promise.resolve(true);
window.syncCareerPathSessionCookie = function (session) {
  const accessToken = session && typeof session.access_token === 'string' ? session.access_token : null;
  const request = async () => {
    try {
      const response = await fetch('/api/auth/session-cookie', {
        method: accessToken ? 'POST' : 'DELETE', credentials: 'same-origin',
        headers: accessToken ? { 'Content-Type': 'application/json' } : {},
        body: accessToken ? JSON.stringify({ accessToken }) : undefined
      });
      return response.ok;
    } catch (_error) { return false; }
  };
  careerPathCookieSyncChain = careerPathCookieSyncChain.catch(() => false).then(request);
  return careerPathCookieSyncChain;
};
window.clearCareerPathSessionCookie = () => window.syncCareerPathSessionCookie(null);
function attachCareerPathCookieSync(client) {
  if (!client || !client.auth || typeof client.auth.getSession !== 'function' ||
      typeof client.auth.onAuthStateChange !== 'function' ||
      window.__careerPathCookieSyncClient === client) return;
  window.__careerPathCookieSyncClient = client;
  client.auth.onAuthStateChange((_event, session) => { void window.syncCareerPathSessionCookie(session || null); });
  client.auth.getSession().then(({ data, error }) => {
    if (!error) void window.syncCareerPathSessionCookie(data && data.session ? data.session : null);
  }).catch(() => {});
}


// Function to initialize Supabase client when the global is available
function initSupabaseClient() {
  // Check if supabase global is available (from the CDN script)
  if (window.supabase) {
    // Keep one client per page so the verifier created during OAuth initiation
    // is available to the callback page through the same origin storage.
    if (window.supabase.auth && typeof window.supabase.auth.getSession === 'function') {
      window.API_BASE = window.API_BASE || "/api";
      attachCareerPathCookieSync(window.supabase);
      return true;
    }

    // Create Supabase client and attach to window for global access
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true
      }
    });
    console.log('✅ Supabase client initialized successfully');
    attachCareerPathCookieSync(window.supabase);

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
