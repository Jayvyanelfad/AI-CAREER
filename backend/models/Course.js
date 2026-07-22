document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const chosenCourse = urlParams.get('course');
    document.getElementById('chosen-course').textContent = chosenCourse;

    // Define your course content
    const courseContents = {
        "Leadership and Teamwork": `
            <section>
                <h2>Leadership and Teamwork</h2>
                <img src="path/to/leadership-image.jpg" alt="Leadership and Teamwork">
                <ul>
                    <li><strong>Lesson 1: Understanding Leadership</strong><p>Explore different leadership styles and their impact on teams.</p></li>
                    <li><strong>Lesson 2: Building Effective Teams</strong><p>Learn the principles of building and managing high-performing teams.</p></li>
                    <li><strong>Lesson 3: Communication in Teams</strong><p>Understand the importance of clear communication within teams.</p></li>
                    <li><strong>Lesson 4: Delegation and Empowerment</strong><p>Develop skills to delegate tasks effectively and empower team members.</p></li>
                    <li><strong>Lesson 5: Conflict Management</strong><p>Learn strategies to manage and resolve conflicts within teams.</p></li>
                    <li><strong>Lesson 6: Motivating Your Team</strong><p>Discover techniques to motivate and inspire your team towards achieving goals.</p></li>
                    <li><strong>Lesson 7: Evaluating Performance</strong><p>Understand the processes of evaluating and improving team performance.</p></li>
                </ul>
            </section>
        `,
        "Emotional Intelligence": `
            <section>
                <h2>Emotional Intelligence</h2>
                <img src="path/to/emotional-intelligence-image.jpg" alt="Emotional Intelligence">
                <ul>
                    <li><strong>Lesson 1: Introduction to Emotional Intelligence</strong><p>Learn the basics of emotional intelligence and its importance in personal and professional life.</p></li>
                    <li><strong>Lesson 2: Self-awareness</strong><p>Develop skills to recognize and understand your own emotions.</p></li>
                    <li><strong>Lesson 3: Self-regulation</strong><p>Learn techniques to manage and control your emotions effectively.</p></li>
                    <li><strong>Lesson 4: Empathy</strong><p>Understand the importance of empathy and how to practice it.</p></li>
                    <li><strong>Lesson 5: Social Skills</strong><p>Improve your social skills to build better relationships.</p></li>
                    <li><strong>Lesson 6: Motivation</strong><p>Learn how to use emotional intelligence to stay motivated and achieve your goals.</p></li>
                    <li><strong>Lesson 7: Applying Emotional Intelligence</strong><p>Discover how to apply emotional intelligence in various aspects of your life.</p></li>
                </ul>
            </section>
        `,
        "Effective Communication": `
            <section>
                <h2>Effective Communication</h2>
                <img src="path/to/effective-communication-image.jpg" alt="Effective Communication">
                <ul>
                    <li><strong>Lesson 1: The Basics of Communication</strong><p>Understand the fundamental principles of effective communication.</p></li>
                    <li><strong>Lesson 2: Active Listening</strong><p>Learn how to listen actively to understand and engage better with others.</p></li>
                    <li><strong>Lesson 3: Non-verbal Communication</strong><p>Explore the importance of body language, facial expressions, and gestures.</p></li>
                    <li><strong>Lesson 4: Persuasive Communication</strong><p>Develop skills to influence and persuade others effectively.</p></li>
                    <li><strong>Lesson 5: Public Speaking</strong><p>Overcome the fear of public speaking and learn to deliver impactful speeches.</p></li>
                    <li><strong>Lesson 6: Conflict Resolution</strong><p>Learn strategies to resolve conflicts and communicate effectively in challenging situations.</p></li>
                    <li><strong>Lesson 7: Building Rapport</strong><p>Understand techniques to build and maintain rapport in personal and professional settings.</p></li>
                </ul>
            </section>
        `,
        "Time Management": `
            <section>
                <h2>Time Management</h2>
                <img src="path/to/time-management-image.jpg" alt="Time Management">
                <ul>
                    <li><strong>Lesson 1: Introduction to Time Management</strong><p>Learn the basics of time management and its importance in personal and professional life.</p></li>
                    <li><strong>Lesson 2: Setting Goals</strong><p>Develop skills to set realistic and achievable goals.</p></li>
                    <li><strong>Lesson 3: Prioritization Techniques</strong><p>Learn techniques to prioritize tasks effectively.</p></li>
                    <li><strong>Lesson 4: Planning and Scheduling</strong><p>Understand the importance of planning and scheduling in time management.</p></li>
                    <li><strong>Lesson 5: Managing Interruptions</strong><p>Learn strategies to manage and minimize interruptions.</p></li>
                    <li><strong>Lesson 6: Time Management Tools</strong><p>Discover various tools and techniques to enhance your time management skills.</p></li>
                    <li><strong>Lesson 7: Reviewing and Improving</strong><p>Understand the processes of reviewing and improving your time management skills.</p></li>
                </ul>
            </section>
        `
    };

    // Display the chosen course content
    const courseContent = courseContents[chosenCourse];
    if (courseContent) {
        document.getElementById('course-content').innerHTML = courseContent;
    } else {
        document.getElementById('course-content').innerHTML = '<p>Course content not found.</p>';
    }
});
