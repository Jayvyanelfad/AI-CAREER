// Use shared API base from supabase-config.js
const API_BASE = window.API_BASE || '/api';

// � ✅ Global JS error trap
window.addEventListener("error", (e) => {
    console.error("���🔥 Global JS Error:", e.message, "at", e.filename, ":", e.lineno);
});

// Google Sign-In Handler using Supabase
async function handleGoogleSignIn() {
    const message = document.getElementById('google-signin-message');
    message.textContent = 'Signing in with Google...';
    message.style.color = 'var(--primary)';

    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth-callback.html`
            }
          });

        if (error) throw error;
        // The method will redirect to Google and then back to auth-callback.html
        // No need to handle session here.
    } catch (err) {
        console.error('Google Sign-In Error:', err);
        message.textContent = 'Google sign-in could not be started. Please try again.';
        message.style.color = 'var(--danger)';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("���🔥 login.js loaded");

    const loginForm = document.getElementById("login-form");
    const submitBtn = document.getElementById("submit-btn");
    const errorElement = document.getElementById("error-message");

    if (!loginForm) {
        console.error("��❌ login-form not found");
        return;
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorElement.style.display = "none";

        submitBtn.disabled = true;
        document.querySelector(".btn-text").classList.add("hidden");
        document.querySelector(".spinner").classList.remove("hidden");

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const emailInput = document.getElementById("email");
        if (!email || !password) {
            return showError("Please fill in all fields.");
        }

        if (!emailInput.checkValidity()) return showError('Enter a valid email address.');

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                data = {};
            }

            if (!res.ok) {
                const errorText = `${data.error || ''} ${text || ''}`.toLowerCase();
                if (res.status === 401 || /invalid login|invalid credentials|wrong password/.test(errorText)) {
                    throw new Error('The email or password is incorrect.');
                }
                if (/confirm|not confirmed/.test(errorText)) {
                    throw new Error('Check your email to confirm your account before signing in.');
                }
                throw new Error('We could not sign you in. Please try again.');
            }

            if (!data.token || !data.refresh_token) {
                throw new Error('We could not establish a secure sign-in session. Please try again.');
            }
            if (data.token && data.refresh_token) {
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token: data.token,
                    refresh_token: data.refresh_token
                });
                if (sessionError) throw sessionError;
                if (!sessionData || !sessionData.session) throw new Error('We could not establish a secure sign-in session. Please try again.');
                localStorage.setItem("token", sessionData.session.access_token);
            }
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect based on user state
            if (data.user.careerTestCompleted) {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "career-test.html";
            }
        } catch (error) {
            console.error("��❌ Login error:", error);
            showError(error.message || "Something went wrong. Try again.");
        } finally {
            submitBtn.disabled = false;
            document.querySelector(".btn-text").classList.remove("hidden");
            document.querySelector(".spinner").classList.add("hidden");
        }
    });

    // �� 👁��️ Toggle password visibility
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.querySelector(".password-toggle");

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener("click", (e) => {
            e.preventDefault();
            const isVisible = passwordInput.type === "text";
            passwordInput.type = isVisible ? "password" : "text";
            passwordToggle.textContent = isVisible ? "Show" : "Hide";
            passwordToggle.setAttribute("aria-pressed", String(!isVisible));
            passwordToggle.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
        });
    }

    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
        submitBtn.disabled = false;
        document.querySelector(".btn-text").classList.remove("hidden");
        document.querySelector(".spinner").classList.add("hidden");
        window.scrollTo(0, 0);
    }

    // Google Sign-In button handler - NOW USING DIRECT GOOGLE OAUTH FLOW
    const googleButton = document.getElementById('google-signin-btn');
    if (googleButton) {
        googleButton.addEventListener('click', handleGoogleSignIn);
    }

    const forgotPasswordButton = document.getElementById('forgot-password-btn');
    const resetMessage = document.getElementById('auth-reset-message');
    if (forgotPasswordButton && resetMessage) {
        forgotPasswordButton.addEventListener('click', async () => {
            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();
            resetMessage.hidden = false;
            if (!email || !emailInput.checkValidity()) {
                resetMessage.textContent = 'Enter a valid email address above, then request a reset link.';
                emailInput.focus();
                return;
            }

            forgotPasswordButton.disabled = true;
            resetMessage.textContent = 'Sending a password reset link…';
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password.html`
                });
                if (error) throw error;
                resetMessage.textContent = 'If an account uses this address, a password reset link is on its way.';
            } catch (_error) {
                resetMessage.textContent = 'We could not send a reset link right now. Please try again later.';
            } finally {
                forgotPasswordButton.disabled = false;
            }
        });
    }
});
