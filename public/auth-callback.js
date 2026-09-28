// auth-callback.js
// Supabase OAuth and email confirmations both return here. In PKCE mode the
// client detects ?code=... and exchanges it using the verifier stored at signup.
//
// Routing rule (unchanged, same as login.js):
//   careerTestCompleted truthy -> dashboard.html
//   otherwise                  -> career-test.html
// Any failure (no session, /api/auth/me error, timeout, script error)
// -> login.html, so the user is never left sitting on this page.
//
// Note on "OTP expired" after registering: Supabase confirmation links are
// single-use. The first visit (email-client prefetch, double click, or an
// earlier click) confirms the address server-side and consumes the OTP. Any
// later visit with the same link redirects back with error_code=otp_expired,
// even though the account is now confirmed and login works. So otp_expired
// must direct the user to Login first instead of only offering a new link.

(async function () {
  const API_BASE = window.API_BASE || '/api';
  const statusEl = document.getElementById("status-message");
  const ME_TIMEOUT_MS = 10000;

  const EXPIRED_MESSAGE =
    'This confirmation link has already been used or has expired. Your account is usually confirmed by now — please try logging in. If login asks for confirmation, request a new confirmation email from the registration page.';
  const VERIFIER_MESSAGE =
    'This confirmation link cannot be verified in this browser. Return to registration, request a new link, and open it in the same browser.';
  const GENERIC_MESSAGE =
    'We could not complete sign-in. Return to Login or create an account to try again.';

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

  function isExpiredError(err) {
    if (!err) return false;
    const code = String(err.code || err.name || err.status || '').toLowerCase();
    const message = String(err.message || err.error_description || err.msg || '').toLowerCase();
    return code.includes('otp_expired')
      || /link.*(expired|invalid)|otp.*expired|token.*expired|expired.*token/.test(message)
      || /invalid.*link|link.*invalid/.test(message);
  }

  function isVerifierError(err) {
    if (!err) return false;
    const code = String(err.code || err.name || '').toLowerCase();
    const message = String(err.message || '').toLowerCase();
    return code.includes('bad_code_verifier') || /code verifier/.test(message);
  }

  // supabase-config.js creates the client asynchronously (polls for the CDN
  // global). Wait for a usable client instead of throwing on first paint.
  async function waitForSupabaseClient() {
    for (let i = 0; i < 50; i++) {
      if (window.supabase && window.supabase.auth && typeof window.supabase.auth.getSession === 'function') {
        return window.supabase;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('Supabase client did not initialize');
  }

  try {
    const supabaseClient = await waitForSupabaseClient();
    const params = callbackParameters();
    const errorCode = (params.get('error_code') || params.get('error') || '').toLowerCase();
    const errorDescription = params.get('error_description') || '';

    if (errorCode) {
      const expired = errorCode === 'otp_expired'
        || (errorCode === 'access_denied' && /expired|invalid/i.test(errorDescription));
      const verifierMissing = errorCode === 'bad_code_verifier' || /code verifier/i.test(errorDescription);
      showFailure(expired ? EXPIRED_MESSAGE : verifierMissing ? VERIFIER_MESSAGE : GENERIC_MESSAGE);
      return;
    }

    // Implicit-style links carry ?token_hash=...&type=signup. PKCE links carry
    // ?code=... and are normally auto-exchanged on client creation, but handle
    // both explicitly so the callback works regardless of the email template.
    const tokenHash = params.get('token_hash');
    const otpType = params.get('type');
    if (tokenHash && otpType) {
      const { data, error } = await supabaseClient.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
      if (error) {
        showFailure(isExpiredError(error) ? EXPIRED_MESSAGE : isVerifierError(error) ? VERIFIER_MESSAGE : GENERIC_MESSAGE, error);
        return;
      }
      if (data && data.session) {
        await finishSignIn(data.session);
        return;
      }
      // Verified but no session returned (e.g. already verified) — fall
      // through to the session check below.
    }

    // Awaiting initialization ensures a PKCE code or supported token-fragment
    // response has finished processing before we read the persisted session.
    if (typeof supabaseClient.auth.initialize === 'function') {
      const { error: callbackError } = await supabaseClient.auth.initialize();
      if (callbackError) {
        showFailure(
          isExpiredError(callbackError) ? EXPIRED_MESSAGE
            : isVerifierError(callbackError) ? VERIFIER_MESSAGE
            : GENERIC_MESSAGE,
          callbackError
        );
        return;
      }
    }

    let session = (await supabaseClient.auth.getSession()).data?.session || null;

    // Fallback: if auto-detect did not pick up a ?code= link (SDK version
    // differences), exchange it explicitly using this browser's PKCE verifier.
    const code = new URLSearchParams(window.location.search).get('code');
    if (!session && code && typeof supabaseClient.auth.exchangeCodeForSession === 'function') {
      const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
      if (error) {
        showFailure(isExpiredError(error) ? EXPIRED_MESSAGE : isVerifierError(error) ? VERIFIER_MESSAGE : GENERIC_MESSAGE, error);
        return;
      }
      session = data?.session || null;
    }

    if (!session) {
      const fragmentError = params.get('error_description');
      const expired = /expired|invalid.*link/i.test(fragmentError || '');
      showFailure(expired ? EXPIRED_MESSAGE : GENERIC_MESSAGE);
      return;
    }

    await finishSignIn(session);
  } catch (err) {
    showFailure(GENERIC_MESSAGE, err);
  }

  async function finishSignIn(session) {
    const token = session.access_token;
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
        const allowedPath = /^\/(?:courses(?:\.html)?|course-detail\.html|programming(?:\.html)?|dashboard\.html|profile\.html|career-test\.html|exam\.html|certificate\.html)$/i;
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
  }
})();
