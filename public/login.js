// Get base API URL
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;

// ✅ Global JS error trap
window.addEventListener("error", (e) => {
    console.error("🔥 Global JS Error:", e.message, "at", e.filename, ":", e.lineno);
});

// Google Sign-In Handler
function handleGoogleSignIn(response) {
    const { credential } = response;
    if (!credential) return;

    try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const decoded = JSON.parse(jsonPayload);
        const { email, name, picture } = decoded;

        const message = document.getElementById('google-signin-message');
        message.textContent = '✓ Signing in...';
        message.style.color = 'var(--primary)';

        fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId: credential, email, name, picture })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success || data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user.careerGoal && data.user.careerGoal !== 'undecided') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'career-test.html';
                }
            } else {
                throw new Error(data.error || 'Failed');
            }
        })
        .catch(err => {
            message.textContent = `Error: ${err.message}`;
            message.style.color = 'var(--danger)';
        });
    } catch (err) {
        console.error('Error:', err);
        const message = document.getElementById('google-signin-message');
        message.textContent = 'Failed to process sign-in';
        message.style.color = 'var(--danger)';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔥 login.js loaded");

    const loginForm = document.getElementById("login-form");
    const submitBtn = document.getElementById("submit-btn");
    const errorElement = document.getElementById("error-message");

    if (!loginForm) {
        console.error("❌ login-form not found");
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
            return showError("⚠️ Please fill in all fields.");
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
            console.error("❌ Login error:", error);
            showError(error.message || "Something went wrong. Try again.");
        } finally {
            submitBtn.disabled = false;
            document.querySelector(".btn-text").classList.remove("hidden");
            document.querySelector(".spinner").classList.add("hidden");
        }
    });

    // 👁️ Toggle password visibility
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

    // Initialize Google Sign-In
    google.accounts.id.initialize({
        client_id: '828346901046-c2b5f5v0j9q8f5v0j9q8f5v0j9q8f5v0.apps.googleusercontent.com',
        callback: handleGoogleSignIn
    });

    google.accounts.id.renderButton(
        document.getElementById('google-signin-container'),
        { theme: 'outline', size: 'large', width: '100%' }
    );
});