// Get base API URL
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;

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
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google'
        });

        if (error) throw error;

        // Supabase handles redirect and session automatically
        // But we can also handle it manually if needed:
        const { data: { session } } = data;
        if (session) {
            localStorage.setItem('token', session.access_token);

            // Get user data from our backend
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const user = await res.json();
            localStorage.setItem('user', JSON.stringify(user));

            if (user.careerGoal && user.careerGoal !== 'undecided') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'career-test.html';
            }
        }
    } catch (err) {
        console.error('Google Sign-In Error:', err);
        message.textContent = `Sign-in failed: ${err.message}`;
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

        if (!email || !password) {
            return showError("��⚠��️ Please fill in all fields.");
        }

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Login failed");

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect based on user state
            if (data.user.careerGoal && data.user.careerGoal !== 'undecided') {
                window.location.href = "dashboard.html";
            } else {
                window.location.href = "career-test.html"; // First-time users take career test
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
    const toggleIcon = document.querySelector(".password-toggle i");

    if (toggleIcon && passwordInput) {
        document.querySelector(".password-toggle").addEventListener("click", (e) => {
            e.preventDefault();
            const isVisible = passwordInput.type === "text";
            passwordInput.type = isVisible ? "password" : "text";
            toggleIcon.classList.toggle("fa-eye");
            toggleIcon.classList.toggle("fa-eye-slash");
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

    // Google Sign-In button handler
    const googleButton = document.getElementById('google-signin-btn');
    if (googleButton) {
        googleButton.addEventListener('click', handleGoogleSignIn);
    }
});