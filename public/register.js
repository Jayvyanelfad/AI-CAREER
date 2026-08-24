// Get base API URL
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;

window.addEventListener("error", (e) => {
    console.error("���������🔥 Global JS Error:", e.message, "at", e.filename, ":", e.lineno);
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
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const user = await res.json();
            localStorage.setItem('user', JSON.stringify(user));

            setTimeout(() => window.location.href = 'career-test.html', 800);
        }
    } catch (err) {
        console.error('Google Sign-In Error:', err);
        message.textContent = `Sign-in failed: ${err.message}`;
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
        const careerGoal = document.getElementById("careerGoal").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!name || !email || !password || !careerGoal) {
            return showError("������⚠������️ Please fill in all fields.");
        }

        if (password !== confirmPassword) {
            return showError("������⚠������️ Passwords do not match.");
        }

        if (password.length < 6) {
            return showError("������⚠������️ Password must be at least 6 characters.");
        }

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, careerGoal }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Registration failed");

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

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
            const icon = toggle.querySelector("i");
            const isVisible = input.type === "text";
            input.type = isVisible ? "password" : "text";
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
        });
    });

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