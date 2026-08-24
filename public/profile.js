// profile.js

(async function () {
  const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Profile elements
  const profileNameDisplay = document.getElementById("profile-name-display");
  const profileEmailDisplay = document.getElementById("profile-email-display");
  const profileCareerDisplay = document.getElementById("profile-career-display");
  const profileLevel = document.getElementById("profile-level");
  const profileBadges = document.getElementById("profile-badges");
  const profileStreak = document.getElementById("profile-streak");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  // Form elements
  const profileEditForm = document.getElementById("profile-edit-form");
  const profileNameInput = document.getElementById("profile-name");
  const profileCareerGoalSelect = document.getElementById("profile-careerGoal");
  const saveBtn = document.getElementById("save-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const profileMessage = document.getElementById("profile-message");

  // Tab elements
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Settings elements
  const emailNotifications = document.getElementById("email-notifications");
  const careerUpdates = document.getElementById("career-updates");
  const privacyMode = document.getElementById("privacy-mode");
  const themeSelect = document.getElementById("theme-select");
  const languageSelect = document.getElementById("language-select");
  const exportDataBtn = document.getElementById("export-data-btn");
  const deleteAccountBtn = document.getElementById("delete-account-btn");

  function showMessage(text, isError = false) {
    profileMessage.textContent = text;
    profileMessage.style.display = "block";
    profileMessage.style.color = isError ? "var(--danger)" : "var(--primary)";

    // Hide message after 3 seconds
    setTimeout(() => {
      profileMessage.style.display = "none";
    }, 3000);
  }

  // Load current profile
  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Could not load profile");
      const resData = await res.json();
      const user = resData.user;

      // Update display
      profileNameDisplay.textContent = user.name || "User";
      profileEmailDisplay.textContent = user.email || "";
      profileCareerDisplay.textContent = `Career Goal: ${user.careerGoal || "Not set"}`;

      // Update form values for editing
      profileNameInput.value = user.name || "";
      profileCareerGoalSelect.value = user.careerGoal || "undecided";

      // Update stats (mock data for now)
      profileLevel.textContent = "Level 3";
      profileBadges.textContent = "5";
      profileStreak.textContent = "12 days";

      // Update progress (mock data)
      const progressPercent = 65; // This would come from actual data
      progressFill.style.width = `${progressPercent}%`;
      progressText.textContent = `${progressPercent}% Complete`;

      // Keep localStorage user copy in sync
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.name = user.name || "";
      stored.email = user.email || "";
      stored.careerGoal = user.careerGoal || "";
      localStorage.setItem("user", JSON.stringify(stored));
    } catch (err) {
      console.error(err);
      showMessage("Could not load your profile. Try refreshing the page.", true);
    }
  }

  // Save profile changes
  profileEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.querySelector(".btn-text").classList.add("hidden");
    saveBtn.querySelector(".spinner").classList.remove("hidden");

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileNameInput.value.trim(),
          careerGoal: profileCareerGoalSelect.value
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      // Update display
      profileNameDisplay.textContent = profileNameInput.value.trim();
      profileCareerDisplay.textContent = `Career Goal: ${profileCareerGoalSelect.value}`;

      // Keep localStorage user copy in sync
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.name = profileNameInput.value.trim();
      stored.careerGoal = profileCareerGoalSelect.value;
      localStorage.setItem("user", JSON.stringify(stored));

      showMessage("✓ Profile updated!");

      // Switch back to view mode
      profileEditForm.style.display = "none";
      document.getElementById("profile-content").style.display = "block";
    } catch (err) {
      showMessage(err.message || "Something went wrong.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.querySelector(".btn-text").classList.remove("hidden");
      saveBtn.querySelector(".spinner").classList.add("hidden");
    }
  });

  // Cancel edit
  cancelEditBtn.addEventListener("click", () => {
    profileEditForm.style.display = "none";
    document.getElementById("profile-content").style.display = "block";
  });

  // Edit profile button
  editProfileBtn.addEventListener("click", () => {
    profileEditForm.style.display = "block";
    document.getElementById("profile-content").style.display = "none";
    profileNameInput.focus();
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove("active"));
      tabPanes.forEach(pane => pane.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      // Show corresponding tab pane
      const tabId = button.getAttribute("data-tab") + "-tab";
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Settings saving
  function saveSettings() {
    const settings = {
      emailNotifications: emailNotifications.checked,
      careerUpdates: careerUpdates.checked,
      privacyMode: privacyMode.checked,
      theme: themeSelect.value,
      language: languageSelect.value
    };

    localStorage.setItem("userSettings", JSON.stringify(settings));
    showMessage("Settings saved!");
  }

  // Load settings on startup
  function loadSettings() {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      emailNotifications.checked = settings.emailNotifications || true;
      careerUpdates.checked = settings.careerUpdates || true;
      privacyMode.checked = settings.privacyMode || false;
      themeSelect.value = settings.theme || "dark";
      languageSelect.value = settings.language || "en";
    }
  }

  // Event listeners for settings
  emailNotifications.addEventListener("change", saveSettings);
  careerUpdates.addEventListener("change", saveSettings);
  privacyMode.addEventListener("change", saveSettings);
  themeSelect.addEventListener("change", saveSettings);
  languageSelect.addEventListener("change", saveSettings);

  exportDataBtn.addEventListener("click", () => {
    // In a real app, this would export user data
    showMessage("Data export feature coming soon!");
  });

  deleteAccountBtn.addEventListener("click", () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // In a real app, this would call the delete account API
      showMessage("Account deletion feature coming soon!");
    }
  });

  // Initialize
  loadProfile();
  loadSettings();

  window.logout = async function () {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userSettings");
    window.location.href = "index.html";
  };
})();