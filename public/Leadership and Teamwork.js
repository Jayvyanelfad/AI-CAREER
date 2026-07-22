document.addEventListener("DOMContentLoaded", function () {
    const completeButton = document.createElement("button");
    completeButton.textContent = "Mark as Complete";
    completeButton.className = "complete-btn";
    document.querySelector(".course-actions").appendChild(completeButton);

    completeButton.addEventListener("click", function () {
        document.getElementById("confirmation-modal").classList.remove("hidden");
    });

    document.getElementById("confirm-yes").addEventListener("click", async function () {
        const userEmail = localStorage.getItem("userEmail");
        const courseName = "Leadership and Teamwork";

        try {
            const response = await fetch(`http://localhost:5000/enroll/${userEmail}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course: courseName })
            });

            if (response.ok) {
                alert("Course marked as complete!");
                document.getElementById("confirmation-modal").classList.add("hidden");
            } else {
                throw new Error("Failed to mark course as complete");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong. Try again later.");
        }
    });

    document.getElementById("confirm-no").addEventListener("click", function () {
        document.getElementById("confirmation-modal").classList.add("hidden");
    });

    document.getElementById("download-certificate").addEventListener("click", async function () {
        const userEmail = localStorage.getItem("userEmail");
        const courseName = "Leadership and Teamwork";

        try {
            const response = await fetch(`http://localhost:5000/certificate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, course: courseName })
            });

            const result = await response.json();
            if (result.certificateUrl) {
                window.open(result.certificateUrl, "_blank");
            } else {
                alert("Certificate not ready yet.");
            }
        } catch (error) {
            console.error("Error downloading certificate:", error);
            alert("Error downloading certificate.");
        }
    });

    // Optionally set user name from localStorage
    const username = localStorage.getItem("username");
    if (username) {
        document.getElementById("username").textContent = username;
    }
});
