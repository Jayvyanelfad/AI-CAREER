// auth-callback.js
// After Google sign-in, Supabase redirects here with the session baked into
// the URL. supabase-js automatically picks it up — we just need to read it.
//
// Routing rule (unchanged, same as login.js):
//   careerTestCompleted truthy -> dashboard.html
//   otherwise                  -> career-test.html
// Any failure (no session, /api/auth/me error, timeout, script error)
// -> login.html, so the user is never left sitting on this page.

(async function () {
  const API_BASE = window.API_BASE || '/api';
  const statusEl = document.getElementById("status-message");
  const ME_TIMEOUT_MS = 10000;

  function fail(reason, err) {
    console.error("[auth-callback] " + reason, err || "");
    if (statusEl) statusEl.textContent = "Sign-in failed. Redirecting to login...";
    setTimeout(() => (window.location.href = "login.html"), 1500);
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data || !data.session) {
      return fail("No Supabase session after OAuth redirect", error);
    }

    const token = data.session.access_token;
    localStorage.setItem("token", token);

    // Abort if the server never answers, instead of hanging on this page forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ME_TIMEOUT_MS);
    let user;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`/api/auth/me responded ${res.status}`);
      }
      user = await res.json();
    } finally {
      clearTimeout(timer);
    }

    localStorage.setItem("user", JSON.stringify(user));
    console.log("[auth-callback] careerTestCompleted =", user.careerTestCompleted);

    const next = new URLSearchParams(window.location.search).get('next');
    if (next) {
      try {
        const target = new URL(next, window.location.origin);
        const allowedPath = /^\/(?:courses(?:\.html)?|course-detail\.html|programming(?:\.html)?|dashboard\.html|profile\.html|career-test\.html)$/i;
        if (target.origin === window.location.origin && allowedPath.test(target.pathname)) {
          window.location.href = `${target.pathname}${target.search}${target.hash}`;
          return;
        }
      } catch (_error) {
        // Fall through to the existing career-state destination.
      }
    }

    if (user.careerTestCompleted) {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "career-test.html";
    }
  } catch (err) {
    fail("Sign-in flow failed", err);
  }
})();
