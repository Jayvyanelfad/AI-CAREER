// Get base API URL  
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;

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
                setTimeout(() => window.location.href = 'career-test.html', 800);
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
            return showError("⚠️ Please fill in all fields.");
        }

        if (password !== confirmPassword) {
            return showError("⚠️ Passwords do not match.");
        }

        if (password.length < 6) {
            return showError("⚠️ Password must be at least 6 characters.");
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