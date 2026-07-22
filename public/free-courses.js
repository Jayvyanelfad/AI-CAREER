document.addEventListener("DOMContentLoaded", function() {
    // DOM Elements
    const loadingOverlay = document.getElementById("loading");
    const courseButtons = document.querySelectorAll(".course-btn");
    const progressBars = document.querySelectorAll(".progress-bar");

    // Error handling for missing elements
    if (!courseButtons.length || !loadingOverlay) {
        console.error("Critical elements missing from the page");
        return;
    }

    // Initialize progress bars
    function initializeProgressBars() {
        progressBars.forEach(bar => {
            const courseCard = bar.closest(".course-card");
            const courseId = courseCard.dataset.course;
            
            // Check localStorage for completion status
            const isComplete = localStorage.getItem(`${courseId}-complete`) === "true";
            const progress = localStorage.getItem(`${courseId}-progress`) || "0";
            
            if (isComplete) {
                bar.style.width = "100%";
                bar.nextElementSibling.textContent = "100% Complete";
            } else {
                bar.style.width = `${progress}%`;
                bar.nextElementSibling.textContent = `${progress}% Complete`;
            }
        });
    }

    // Handle course button clicks
    courseButtons.forEach(button => {
        button.addEventListener("click", function() {
            const courseLink = this.dataset.courseLink;
            
            // Show loading overlay
            loadingOverlay.classList.remove("hidden");
            loadingOverlay.setAttribute("aria-busy", "true");
            
            // Disable buttons during navigation
            courseButtons.forEach(btn => btn.disabled = true);

            // Simulate loading delay (remove in production)
            setTimeout(() => {
                try {
                    // Check if course exists
                    fetch(courseLink)
                        .then(response => {
                            if (response.ok) {
                                window.location.href = courseLink;
                            } else {
                                throw new Error("Course not found");
                            }
                        })
                        .catch(error => {
                            console.error("Navigation error:", error);
                            loadingOverlay.classList.add("hidden");
                            courseButtons.forEach(btn => btn.disabled = false);
                            alert("The course is currently unavailable. Please try again later.");
                        });
                } catch (error) {
                    console.error("Navigation error:", error);
                    loadingOverlay.classList.add("hidden");
                    courseButtons.forEach(btn => btn.disabled = false);
                    alert("An error occurred. Please try again.");
                }
            }, 1000);
        });
    });

    // Initialize the page
    initializeProgressBars();

    // Set username if available
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
        document.getElementById("username").textContent = storedUsername;
    }
});