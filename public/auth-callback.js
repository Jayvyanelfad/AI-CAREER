// auth-callback.js
// After Google sign-in, Supabase redirects here with the session baked into
// the URL. supabase-js automatically picks it up — we just need to read it.

(async function () {
  const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;
    const statusEl = document.getElementById("status-message");

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        statusEl.textContent = "Sign-in failed. Redirecting to login...";
        setTimeout(() => (window.location.href = "login.html"), 1500);
        return;
    }

    const token = data.session.access_token;
    localStorage.setItem("token", token);

    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const user = await res.json();
        localStorage.setItem("user", JSON.stringify(user));

        if (user.careerGoal && user.careerGoal !== "undecided") {
            window.location.href = "dashboard.html";
        } else {
            window.location.href = "career-test.html";
        }
    } catch (err) {
        console.error(err);
        window.location.href = "dashboard.html";
    }
})();