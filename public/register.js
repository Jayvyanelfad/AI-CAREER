// Use shared API base from supabase-config.js
const API_BASE = window.API_BASE || '/api';

window.addEventListener("error", (e) => {
    console.error("���������🔥 Global JS Error:", e.message, "at", e.filename, ":", e.lineno);
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
    const signupForm = document.getElementById("signup-form");
    const submitBtn = document.getElementById("submit-btn");
    const errorElement = document.getElementById("error-message");

    if (!signupForm) return;

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorElement.style.display = "none";

        submitBtn.disabled = true;
        document.querySelector(".btn-text").classList.add("hidden");
        document.querySelector(".spinner").classList.remove("hidden");

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const emailInput = document.getElementById("email");
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!name || !email || !password || !confirmPassword) {
            return showError("Please fill in all fields.");
        }

        if (!emailInput.checkValidity()) {
            return showError("Enter a valid email address.");
        }

        if (password !== confirmPassword) {
            return showError("Passwords do not match.");
        }

        if (password.length < 6) {
            return showError("������⚠������️ Password must be at least 6 characters.");
        }

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                data = {};
            }

            if (!res.ok) {
                const detail = `${data.error || ''} ${text || ''}`.toLowerCase();
                if (res.status === 409 || /already registered|already exists|duplicate/.test(detail)) {
                    throw new Error('An account may already exist for this email. Try signing in instead.');
                }
                if (/password/.test(detail)) throw new Error('Choose a stronger password and try again.');
                if (/email/.test(detail)) throw new Error('Check the email address and try again.');
                throw new Error('We could not create your account. Please try again.');
            }

            if (!data.token || !data.refresh_token) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                errorElement.textContent = "Check your email to confirm your account before continuing.";
                errorElement.style.color = 'var(--primary)';
                errorElement.style.display = 'block';
                return;
            }

            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: data.token,
                refresh_token: data.refresh_token
            });
            if (sessionError) throw sessionError;
            if (!sessionData || !sessionData.session) throw new Error("Could not establish the new account session.");
            localStorage.setItem("token", sessionData.session.access_token);
            localStorage.setItem("user", JSON.stringify(data.user || sessionData.session.user));

            // Redirect to career test for personalized roadmap
            window.location.href = "career-test.html";
        } catch (error) {
            showError(error.message || "Something went wrong. Try again.");
        } finally {
            submitBtn.disabled = false;
            document.querySelector(".btn-text").classList.remove("hidden");
            document.querySelector(".spinner").classList.add("hidden");
        }
    });

    // Toggle password visibility for both fields
    document.querySelectorAll(".password-toggle").forEach(toggle => {
        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            const input = toggle.previousElementSibling;
            const isVisible = input.type === "text";
            const fieldName = input.id === "confirmPassword" ? "confirm password" : "password";
            input.type = isVisible ? "password" : "text";
            toggle.textContent = isVisible ? "Show" : "Hide";
            toggle.setAttribute("aria-pressed", String(!isVisible));
            toggle.setAttribute("aria-label", `${isVisible ? "Show" : "Hide"} ${fieldName}`);
        });
    });

    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.color = 'var(--danger)';
        errorElement.style.display = "block";
        submitBtn.disabled = false;
        document.querySelector(".btn-text").classList.remove("hidden");
        document.querySelector(".spinner").classList.add("hidden");
        window.scrollTo(0, 0);
    }

    // Google Sign-In button handler
    const googleButton = document.getElementById('google-signin-btn');
    if (googleButton) {
        googleButton.addEventListener('click', handleGoogleSignIn);
    }
});
