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
    const emailInput = document.getElementById("email");

    if (!signupForm) return;

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorElement.style.display = "none";

        submitBtn.disabled = true;
        document.querySelector(".btn-text").classList.add("hidden");
        document.querySelector(".spinner").classList.remove("hidden");

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
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
            // Signup must run in this browser so the PKCE verifier is stored in
            // the same browser that opens the confirmation link.
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth-callback.html`,
                    data: { full_name: name, career_goal: 'undecided' }
                }
            });
            if (error) {
                const message = String(error.message || '').toLowerCase();
                if (/already registered|already exists|user exists/.test(message)) {
                    showAccountExists();
                    return;
                }
                if (/password/.test(message)) throw new Error('Choose a stronger password and try again.');
                if (/email/.test(message)) throw new Error('Check the email address and try again.');
                throw new Error('We could not create your account. Please try again.');
            }

            const user = data && data.user;
            if (!user) throw new Error('We could not create your account. Please try again.');

            // Supabase may return a non-error response with no identities for
            // an existing address to reduce account enumeration.
            if (Array.isArray(user.identities) && user.identities.length === 0) {
                showAccountExists();
                return;
            }

            if (!data.session) {
                setFeedback('Check your email for a confirmation link. Open it in this browser to finish creating your account.', 'success');
                showConfirmationActions(true);
                return;
            }

            await completeProfile(data.session.access_token);
            localStorage.setItem("token", data.session.access_token);
            localStorage.setItem("user", JSON.stringify(user));
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
        showConfirmationActions(false);
        submitBtn.disabled = false;
        document.querySelector(".btn-text").classList.remove("hidden");
        document.querySelector(".spinner").classList.add("hidden");
        window.scrollTo(0, 0);
    }

    function setFeedback(message, kind = 'error') {
        errorElement.textContent = message;
        errorElement.style.color = kind === 'success' ? 'var(--primary)' : 'var(--danger)';
        errorElement.style.display = 'block';
    }

    function showConfirmationActions(showResend) {
        const actions = document.getElementById('signup-feedback-actions');
        const resendButton = document.getElementById('resend-confirmation-btn');
        if (actions) actions.hidden = false;
        if (resendButton) resendButton.hidden = !showResend;
    }

    function showAccountExists() {
        setFeedback('An account may already exist for this email. Log in, or request a new confirmation email if you have not confirmed it.', 'error');
        showConfirmationActions(true);
    }

    async function completeProfile(accessToken) {
        const response = await fetch(`${API_BASE}/auth/complete-registration`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Your account was confirmed, but we could not finish setting up your profile. Please log in and try again.');
    }

    const resendButton = document.getElementById('resend-confirmation-btn');
    if (resendButton) {
        resendButton.addEventListener('click', async () => {
            const address = emailInput.value.trim();
            if (!address || !emailInput.checkValidity()) {
                setFeedback('Enter a valid email address above before requesting another confirmation email.');
                emailInput.focus();
                return;
            }

            resendButton.disabled = true;
            try {
                const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: address,
                    options: { emailRedirectTo: `${window.location.origin}/auth-callback.html` }
                });
                if (error) throw error;
                setFeedback('If this address has an unconfirmed account, a new confirmation link is on its way.', 'success');
            } catch (_error) {
                setFeedback('We could not resend a confirmation email right now. Please try again later.');
            } finally {
                resendButton.disabled = false;
                showConfirmationActions(true);
            }
        });
    }

    // Google Sign-In button handler
    const googleButton = document.getElementById('google-signin-btn');
    if (googleButton) {
        googleButton.addEventListener('click', handleGoogleSignIn);
    }
});
