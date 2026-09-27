// auth-callback.js
// Supabase OAuth and email confirmations both return here. In PKCE mode the
// client detects ?code=... and exchanges it using the verifier stored at signup.
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

  function callbackParameters() {
    return new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
  }

  function showFailure(message, err) {
    console.error("[auth-callback] " + message, err || "");
    const spinner = document.getElementById('callback-spinner');
    const actions = document.getElementById('callback-actions');
    if (spinner) spinner.hidden = true;
    if (statusEl) statusEl.textContent = message;
    if (actions) actions.hidden = false;
  }

  try {
    const params = callbackParameters();
    const errorCode = (params.get('error_code') || params.get('error') || '').toLowerCase();
    if (errorCode) {
      const expired = errorCode === 'otp_expired' || errorCode === 'access_denied' && /expired|invalid/i.test(params.get('error_description') || '');
      const verifierMissing = errorCode === 'bad_code_verifier' || /code verifier/i.test(params.get('error_description') || '');
      showFailure(expired
        ? 'This confirmation link has expired or is invalid. Return to registration to request a new confirmation email.'
        : verifierMissing
          ? 'This confirmation link cannot be verified in this browser. Return to registration, request a new link, and open it in the same browser.'
          : 'We could not complete sign-in. Return to Login or create an account to try again.');
      return;
    }

    // Supabase JS initializes automatically; awaiting the same initialization
    // promise ensures a PKCE code or supported token-fragment response has
    // finished processing before we read the persisted session.
    const { error: callbackError } = await supabase.auth.initialize();
    if (callbackError) {
      const code = String(callbackError.code || callbackError.name || '').toLowerCase();
      const expired = code.includes('otp_expired') || /expired|invalid.*link/i.test(callbackError.message || '');
      const verifierMissing = code.includes('bad_code_verifier') || /code verifier/i.test(callbackError.message || '');
      showFailure(expired
        ? 'This confirmation link has expired or is invalid. Return to registration to request a new confirmation email.'
        : verifierMissing
          ? 'This confirmation link cannot be verified in this browser. Return to registration, request a new link, and open it in the same browser.'
          : 'We could not complete sign-in. Return to Login or create an account to try again.', callbackError);
      return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error || !data || !data.session) {
      const fragmentError = params.get('error_description');
      const expired = /expired|invalid.*link/i.test(fragmentError || '');
      showFailure(expired
        ? 'This confirmation link has expired or is invalid. Return to registration to request a new confirmation email.'
        : 'No authenticated session was returned. Return to Login or create an account to try again.', error);
      return;
    }

    const token = data.session.access_token;
    const profileResponse = await fetch(`${API_BASE}/auth/complete-registration`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!profileResponse.ok) throw new Error('Could not finish setting up the account profile.');

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
    showFailure('We could not finish confirming your account. Return to Login or create an account to try again.', err);
  }
})();
