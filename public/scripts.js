document.addEventListener('DOMContentLoaded', () => {
    const courses = [
        { title: "Public Speaking", description: "Learn to speak confidently." },
        { title: "Leadership", description: "Enhance your leadership skills." },
        { title: "Time Management", description: "Master the art of managing your time effectively." },
        { title: "Emotional Intelligence", description: "Understand and manage emotions better." }
    ];

    const courseList = document.getElementById('course-list');

    courses.forEach(course => {
        const courseDiv = document.createElement('div');
        courseDiv.classList.add('course');
        courseDiv.innerHTML = `
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <button onclick="enroll('${course.title}')">Enroll Now</button>
        `;
        courseList.appendChild(courseDiv);
    });
});

function enroll(courseTitle) {
    alert(`You have chosen to enroll in: ${courseTitle}`);
}

// ==========================
// CHATBOT LOGIC
// ==========================
function sendMessage() {
    let userText = document.getElementById("userInput").value.trim();
    if (userText === "") return;

    let chatbox = document.getElementById("chatbox");

    // Display user message
    let userDiv = document.createElement("div");
    userDiv.classList.add("userText");
    userDiv.innerHTML = `<span>${userText}</span>`;
    chatbox.appendChild(userDiv);

    document.getElementById("userInput").value = ""; // Clear input

    setTimeout(() => {
        let botDiv = document.createElement("div");
        botDiv.classList.add("botText");
        botDiv.innerHTML = `<span>${getBotResponse(userText)}</span>`;
        chatbox.appendChild(botDiv);
        chatbox.scrollTop = chatbox.scrollHeight; // Auto-scroll
    }, 1000);
}

function getBotResponse(input) {
    // Simple bot responses
    let responses = {
        "hello": "Hi there! How can I assist you?",
        "courses": "We offer Public Speaking, Leadership, Time Management, and Emotional Intelligence courses.",
        "enroll": "You can enroll by clicking the 'Enroll Now' button on a course.",
        "bye": "Goodbye! Have a great day!"
    };

    return responses[input.toLowerCase()] || "I'm not sure about that. Try asking about courses or enrollment.";
}
