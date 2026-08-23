// Career Test Logic - 15 Question Assessment
(function() {
  const quizContainer = document.getElementById('quiz-container');
  const resultsContainer = document.getElementById('results-container');
  const questionTitle = document.getElementById('question-title');
  const optionsContainer = document.getElementById('options-container');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const loadingSpinner = document.getElementById('loading-spinner');
  const resultsContent = document.getElementById('results-content');
  const strengthsSection = document.getElementById('strengths-section');
  const strengthsList = document.getElementById('strengths-list');
  const retakeBtn = document.getElementById('retake-btn');

  // Current state
  let currentQuestion = 0;
  const answers = {};

  // Questions database - 15 questions across 4 categories
  const questions = [
    // WORK STYLE (4 questions)
    {
      id: 1,
      text: "How do you prefer to work on complex projects?",
      options: [
        { text: "Collaboratively with a team", value: "team" },
        { text: "With guidance from experienced mentors", value: "mentor" },
        { text: "Independently on focused tasks", value: "independent" },
        { text: "On open-ended creative problems", value: "creative" }
      ],
      category: "workStyle"
    },
    {
      id: 2,
      text: "What's your ideal work environment?",
      options: [
        { text: "Fast-paced startup with quick decisions", value: "startup" },
        { text: "Structured corporate with clear processes", value: "corporate" },
        { text: "Remote/flexible with autonomy", value: "remote" },
        { text: "Mix of in-person and remote work", value: "hybrid" }
      ],
      category: "workStyle"
    },
    {
      id: 3,
      text: "How do you handle tight deadlines?",
      options: [
        { text: "I thrive under pressure", value: "pressure" },
        { text: "I plan ahead to avoid rush situations", value: "planner" },
        { text: "I adapt my pace based on circumstances", value: "adaptive" },
        { text: "I follow established processes", value: "process" }
      ],
      category: "workStyle"
    },
    {
      id: 4,
      text: "What motivates you most at work?",
      options: [
        { text: "Seeing my work directly impact users", value: "impact" },
        { text: "Learning and professional development", value: "growth" },
        { text: "Stable income and predictable career path", value: "stability" },
        { text: "Being on the cutting edge of technology", value: "innovation" }
      ],
      category: "workStyle"
    },

    // TECHNICAL INTEREST (4 questions)
    {
      id: 5,
      text: "Which tech area interests you most?",
      options: [
        { text: "Frontend (UI, design, user experience)", value: "frontend" },
        { text: "Backend (servers, databases, APIs)", value: "backend" },
        { text: "Data (analysis, visualization, insights)", value: "data" },
        { text: "Infrastructure, deployment & operations", value: "infrastructure" }
      ],
      category: "technical"
    },
    {
      id: 6,
      text: "How do you feel about AI and Machine Learning?",
      options: [
        { text: "Fascinated - I want to build AI systems", value: "buildAI" },
        { text: "Interested in using AI in applications", value: "useAI" },
        { text: "More interested in analyzing data patterns", value: "analyzeData" },
        { text: "Less interested, prefer traditional development", value: "traditional" }
      ],
      category: "technical"
    },
    {
      id: 7,
      text: "What's your preferred programming style?",
      options: [
        { text: "Visual - I like building UIs I can see", value: "visual" },
        { text: "Logic puzzles and algorithmic thinking", value: "algorithmic" },
        { text: "System design and architecture", value: "architecture" },
        { text: "Both frontend and backend equally", value: "fullstack" }
      ],
      category: "technical"
    },
    {
      id: 8,
      text: "How do you approach learning new technologies?",
      options: [
        { text: "Hands-on projects and experimentation", value: "handsOn" },
        { text: "Structured courses and documentation", value: "structured" },
        { text: "Community forums and collaborative learning", value: "community" },
        { text: "Deep dive into theory and fundamentals", value: "theory" }
      ],
      category: "technical"
    },

    // PROBLEM SOLVING (4 questions)
    {
      id: 9,
      text: "When facing a difficult problem, you typically:",
      options: [
        { text: "Break it down into smaller pieces", value: "breakdown" },
        { text: "Research existing solutions", value: "research" },
        { text: "Experiment with different approaches", value: "experiment" },
        { text: "Ask for help and collaborate", value: "collaborate" }
      ],
      category: "problemSolving"
    },
    {
      id: 10,
      text: "What's your relationship with debugging?",
      options: [
        { text: "I love the detective work of debugging", value: "detective" },
        { text: "I approach it strategically with tools", value: "strategic" },
        { text: "It's frustrating but necessary", value: "necessary" },
        { text: "I prefer writing code to avoid bugs", value: "prevent" }
      ],
      category: "problemSolving"
    },
    {
      id: 11,
      text: "How do you measure success in your work?",
      options: [
        { text: "User satisfaction and engagement", value: "satisfaction" },
        { text: "Code quality and system performance", value: "quality" },
        { text: "Data accuracy and insights", value: "accuracy" },
        { text: "Innovation and pushing boundaries", value: "innovationMeasure" }
      ],
      category: "problemSolving"
    },
    {
      id: 12,
      text: "How do you stay updated with tech trends?",
      options: [
        { text: "Very active - follow blogs, podcasts, Twitter", value: "active" },
        { text: "Selective - focus on what's relevant", value: "selective" },
        { text: "Through formal learning and courses", value: "formal" },
        { text: "Mainly through work projects", value: "work" }
      ],
      category: "problemSolving"
    },

    // CAREER VISION (3 questions)
    {
      id: 13,
      text: "Where do you see yourself in 5 years?",
      options: [
        { text: "Deep expert in a specific technology", value: "expert" },
        { text: "Leading a team or division", value: "leader" },
        { text: "Full-stack expert across technologies", value: "fullstackExpert" },
        { text: "Making significant impact on users/business", value: "impactVision" }
      ],
      category: "careerVision"
    },
    {
      id: 14,
      text: "What's more important to you?",
      options: [
        { text: "High salary and financial security", value: "salary" },
        { text: "Work-life balance and flexibility", value: "balance" },
        { text: "Learning opportunities and growth", value: "learning" },
        { text: "Autonomy and decision-making power", value: "autonomy" }
      ],
      category: "careerVision"
    },
    {
      id: 15,
      text: "Ideal company culture for you?",
      options: [
        { text: "Innovation-focused, cutting-edge tech", value: "innovationCulture" },
        { text: "Stable, established, predictable", value: "stable" },
        { text: "Social impact, making a difference", value: "impactCulture" },
        { text: "Creative freedom, artistic expression", value: "creativeCulture" }
      ],
      category: "careerVision"
    }
  ];

  // Career database with scoring weights
  const careers = {
    "Software Developer": {
      icon: "fa-code",
      description: "Build full-stack applications from frontend to backend",
      salary: "₹4-8 LPA Entry, ₹8-15 LPA Mid-level",
      skills: ["JavaScript", "Python", "System Design", "Problem Solving"],
      course: "Full Stack Web Development",
      weights: {
        team: 1, mentor: 2, independent: 3, creative: 1,
        startup: 2, corporate: 2, remote: 3, hybrid: 2,
        pressure: 2, planner: 3, adaptive: 2, process: 2,
        impact: 2, growth: 3, stability: 2, innovation: 3,
        frontend: 2, backend: 2, data: 1, infrastructure: 1,
        buildAI: 1, useAI: 2, analyzeData: 3, traditional: 2,
        visual: 1, algorithmic: 3, architecture: 2, fullstack: 3,
        handsOn: 3, structured: 2, community: 2, theory: 1,
        breakdown: 3, research: 2, experiment: 3, collaborate: 2,
        detective: 3, strategic: 3, necessary: 2, prevent: 1,
        satisfaction: 2, quality: 3, accuracy: 2, innovationMeasure: 3,
        active: 2, selective: 2, formal: 2, work: 2,
        expert: 3, leader: 2, fullstackExpert: 3, impactVision: 2,
        salary: 2, balance: 3, learning: 3, autonomy: 2,
        innovationCulture: 3, stable: 2, impactCulture: 2, creativeCulture: 2
      }
    },
    "Frontend Developer": {
      icon: "fa-paint-brush",
      description: "Create beautiful user interfaces and interactive experiences",
      salary: "₹3-6 LPA Entry, ₹6-12 LPA Mid-level",
      skills: ["HTML/CSS", "JavaScript", "UI/UX Design", "Responsive Design"],
      course: "Frontend Web Development",
      weights: {
        team: 2, mentor: 2, independent: 2, creative: 3,
        startup: 3, corporate: 1, remote: 3, hybrid: 2,
        pressure: 1, planner: 2, adaptive: 3, process: 1,
        impact: 3, growth: 2, stability: 1, innovation: 2,
        frontend: 3, backend: 1, data: 1, infrastructure: 1,
        buildAI: 1, useAI: 2, analyzeData: 1, traditional: 1,
        visual: 3, algorithmic: 1, architecture: 1, fullstack: 2,
        handsOn: 3, structured: 2, community: 2, theory: 1,
        breakdown: 2, research: 2, experiment: 3, collaborate: 3,
        detective: 1, strategic: 2, necessary: 2, prevent: 1,
        satisfaction: 3, quality: 2, accuracy: 1, innovationMeasure: 2,
        active: 3, selective: 2, formal: 1, work: 2,
        expert: 2, leader: 1, fullstackExpert: 2, impactVision: 3,
        salary: 1, balance: 3, learning: 2, autonomy: 3,
        innovationCulture: 3, stable: 1, impactCulture: 2, creativeCulture: 3
      }
    },
    "Backend Developer": {
      icon: "fa-server",
      description: "Build server-side logic, databases, and APIs",
      salary: "₹3-6 LPA Entry, ₹6-12 LPA Mid-level",
      skills: ["Python/Java", "SQL/NoSQL", "API Design", "System Architecture"],
      course: "Backend Development",
      weights: {
        team: 2, mentor: 3, independent: 2, creative: 1,
        startup: 1, corporate: 3, remote: 2, hybrid: 2,
        pressure: 2, planner: 3, adaptive: 2, process: 3,
        impact: 2, growth: 2, stability: 3, innovation: 1,
        frontend: 1, backend: 3, data: 2, infrastructure: 2,
        buildAI: 2, useAI: 2, analyzeData: 3, traditional: 3,
        visual: 1, algorithmic: 3, architecture: 3, fullstack: 2,
        handsOn: 2, structured: 3, community: 2, theory: 2,
        breakdown: 3, research: 3, experiment: 1, collaborate: 2,
        detective: 2, strategic: 3, necessary: 3, prevent: 2,
        satisfaction: 2, quality: 3, accuracy: 3, innovationMeasure: 1,
        active: 2, selective: 3, formal: 3, work: 2,
        expert: 3, leader: 2, fullstackExpert: 2, impactVision: 1,
        salary: 3, balance: 1, learning: 2, autonomy: 1,
        innovationCulture: 1, stable: 3, impactCulture: 1, creativeCulture: 1
      }
    },
    "Full Stack Developer": {
      icon: "fa-layer-group",
      description: "Work across both frontend and backend technologies",
      salary: "₹4-8 LPA Entry, ₹8-15 LPA Mid-level",
      skills: ["HTML/CSS/JS", "Python/Java", "Databases", "DevOps"],
      course: "Full Stack Web Development",
      weights: {
        team: 2, mentor: 2, independent: 2, creative: 2,
        startup: 2, corporate: 2, remote: 3, hybrid: 3,
        pressure: 2, planner: 3, adaptive: 3, process: 2,
        impact: 2, growth: 3, stability: 2, innovation: 2,
        frontend: 2, backend: 2, data: 2, infrastructure: 2,
        buildAI: 2, useAI: 2, analyzeData: 2, traditional: 2,
        visual: 2, algorithmic: 2, architecture: 2, fullstack: 3,
        handsOn: 3, structured: 2, community: 3, theory: 1,
        breakdown: 2, research: 2, experiment: 3, collaborate: 3,
        detective: 2, strategic: 2, necessary: 2, prevent: 1,
        satisfaction: 2, quality: 2, accuracy: 2, innovationMeasure: 2,
        active: 2, selective: 2, formal: 2, work: 3,
        expert: 2, leader: 2, fullstackExpert: 3, impactVision: 2,
        salary: 2, balance: 2, learning: 3, autonomy: 2,
        innovationCulture: 2, stable: 2, impactCulture: 2, creativeCulture: 2
      }
    },
    "Data Scientist": {
      icon: "fa-chart-line",
      description: "Extract insights and build predictive models from data",
      salary: "₹4-9 LPA Entry, ₹9-18 LPA Mid-level",
      skills: ["Python/R", "Statistics", "Machine Learning", "Data Visualization"],
      course: "Data Science Fundamentals",
      weights: {
        team: 2, mentor: 2, independent: 3, creative: 1,
        startup: 2, corporate: 3, remote: 3, hybrid: 2,
        pressure: 1, planner: 3, adaptive: 2, process: 2,
        impact: 2, growth: 3, stability: 2, innovation: 3,
        frontend: 1, backend: 1, data: 3, infrastructure: 1,
        buildAI: 3, useAI: 3, analyzeData: 3, traditional: 1,
        visual: 1, algorithmic: 3, architecture: 2, fullstack: 1,
        handsOn: 2, structured: 3, community: 2, theory: 3,
        breakdown: 3, research: 3, experiment: 2, collaborate: 2,
        detective: 3, strategic: 3, necessary: 2, prevent: 1,
        satisfaction: 2, quality: 2, accuracy: 3, innovationMeasure: 3,
        active: 3, selective: 2, formal: 3, work: 1,
        expert: 3, leader: 1, fullstackExpert: 1, impactVision: 2,
        salary: 2, balance: 2, learning: 3, autonomy: 2,
        innovationCulture: 3, stable: 1, impactCulture: 2, creativeCulture: 1
      }
    },
    "AI/ML Engineer": {
      icon: "fa-brain",
      description: "Develop artificial intelligence and machine learning systems",
      salary: "₹5-10 LPA Entry, ₹10-20 LPA Mid-level",
      skills: ["Python", "TensorFlow/PyTorch", "Math/Statistics", "Deep Learning"],
      course: "Introduction to AI/ML",
      weights: {
        team: 2, mentor: 2, independent: 3, creative: 1,
        startup: 3, corporate: 2, remote: 3, hybrid: 2,
        pressure: 2, planner: 2, adaptive: 2, process: 1,
        impact: 2, growth: 3, stability: 1, innovation: 3,
        frontend: 1, backend: 1, data: 2, infrastructure: 1,
        buildAI: 3, useAI: 2, analyzeData: 3, traditional: 1,
        visual: 1, algorithmic: 3, architecture: 2, fullstack: 1,
        handsOn: 2, structured: 2, community: 2, theory: 3,
        breakdown: 2, research: 2, experiment: 3, collaborate: 2,
        detective: 2, strategic: 2, necessary: 1, prevent: 1,
        satisfaction: 2, quality: 2, accuracy: 2, innovationMeasure: 3,
        active: 3, selective: 1, formal: 2, work: 1,
        expert: 3, leader: 1, fullstackExpert: 1, impactVision: 1,
        salary: 1, balance: 1, learning: 3, autonomy: 2,
        innovationCulture: 3, stable: 1, impactCulture: 2, creativeCulture: 1
      }
    },
    "Data Analyst": {
      icon: "fa-chart-bar",
      description: "Analyze data to help businesses make informed decisions",
      salary: "₹3-6 LPA Entry, ₹6-12 LPA Mid-level",
      skills: ["SQL", "Excel/PowerBI", "Statistics", "Data Visualization"],
      course: "Data Analytics Basics",
      weights: {
        team: 2, mentor: 2, independent: 2, creative: 1,
        startup: 2, corporate: 3, remote: 2, hybrid: 2,
        pressure: 1, planner: 3, adaptive: 2, process: 3,
        impact: 2, growth: 2, stability: 3, innovation: 1,
        frontend: 1, backend: 1, data: 3, infrastructure: 1,
        buildAI: 1, useAI: 2, analyzeData: 3, traditional: 2,
        visual: 1, algorithmic: 2, architecture: 1, fullstack: 1,
        handsOn: 2, structured: 3, community: 2, theory: 2,
        breakdown: 3, research: 3, experiment: 1, collaborate: 2,
        detective: 1, strategic: 2, necessary: 2, prevent: 1,
        satisfaction: 2, quality: 2, accuracy: 3, innovationMeasure: 1,
        active: 2, selective: 3, formal: 3, work: 2,
        expert: 2, leader: 2, fullstackExpert: 1, impactVision: 1,
        salary: 2, balance: 2, learning: 2, autonomy: 1,
        innovationCulture: 1, stable: 3, impactCulture: 1, creativeCulture: 1
      }
    },
    "Cloud Architect": {
      icon: "fa-cloud",
      description: "Design and manage cloud computing systems and infrastructure",
      salary: "₹4-9 LPA Entry, ₹9-18 LPA Mid-level",
      skills: ["AWS/Azure/GCP", "Networking", "Security", "DevOps"],
      course: "Cloud Computing with AWS",
      weights: {
        team: 2, mentor: 2, independent: 2, creative: 1,
        startup: 2, corporate: 3, remote: 3, hybrid: 3,
        pressure: 1, planner: 3, adaptive: 2, process: 2,
        impact: 1, growth: 2, stability: 3, innovation: 1,
        frontend: 1, backend: 1, data: 1, infrastructure: 3,
        buildAI: 1, useAI: 2, analyzeData: 2, traditional: 2,
        visual: 1, algorithmic: 1, architecture: 2, fullstack: 1,
        handsOn: 2, structured: 3, community: 2, theory: 2,
        breakdown: 2, research: 2, experiment: 1, collaborate: 2,
        detective: 1, strategic: 2, necessary: 2, prevent: 2,
        satisfaction: 1, quality: 2, accuracy: 2, innovationMeasure: 1,
        active: 1, selective: 2, formal: 3, work: 2,
        expert: 2, leader: 2, fullstackExpert: 2, impactVision: 1,
        salary: 2, balance: 2, learning: 2, autonomy: 1,
        innovationCulture: 1, stable: 3, impactCulture: 1, creativeCulture: 1
      }
    },
    "DevOps Engineer": {
      icon: "fa-cogs",
      description: "Bridge development and operations with automation and CI/CD",
      salary: "₹4-8 LPA Entry, ₹8-15 LPA Mid-level",
      skills: ["Linux/Shell", "Docker/Kubernetes", "CI/CD", "Monitoring"],
      course: "DevOps Essentials",
      weights: {
        team: 3, mentor: 2, independent: 2, creative: 1,
        startup: 3, corporate: 2, remote: 3, hybrid: 3,
        pressure: 2, planner: 2, adaptive: 2, process: 2,
        impact: 1, growth: 2, stability: 2, innovation: 1,
        frontend: 1, backend: 2, data: 1, infrastructure: 3,
        buildAI: 1, useAI: 1, analyzeData: 1, traditional: 2,
        visual: 1, algorithmic: 1, architecture: 2, fullstack: 2,
        handsOn: 3, structured: 2, community: 2, theory: 1,
        breakdown: 2, research: 1, experiment: 2, collaborate: 2,
        detective: 1, strategic: 2, necessary: 2, prevent: 2,
        satisfaction: 1, quality: 2, accuracy: 1, innovationMeasure: 1,
        active: 1, selective: 1, formal: 2, work: 3,
        expert: 2, leader: 2, fullstackExpert: 2, impactVision: 1,
        salary: 1, balance: 1, learning: 1, autonomy: 2,
        innovationCulture: 1, stable: 2, impactCulture: 1, creativeCulture: 1
      }
    },
    "UI/UX Designer": {
      icon: "fa-user-secret",
      description: "Design intuitive and engaging user experiences",
      salary: "₹3-6 LPA Entry, ₹6-12 LPA Mid-level",
      skills: ["Figma/Sketch", "User Research", "Wireframing", "Prototyping"],
      course: "User Experience Fundamentals",
      weights: {
        team: 2, mentor: 2, independent: 1, creative: 3,
        startup: 3, corporate: 1, remote: 3, hybrid: 2,
        pressure: 1, planner: 1, adaptive: 3, process: 1,
        impact: 3, growth: 2, stability: 1, innovation: 2,
        frontend: 2, backend: 1, data: 1, infrastructure: 1,
        buildAI: 1, useAI: 1, analyzeData: 1, traditional: 1,
        visual: 3, algorithmic: 1, architecture: 1, fullstack: 1,
        handsOn: 2, structured: 1, community: 2, theory: 1,
        breakdown: 1, research: 1, experiment: 2, collaborate: 3,
        detective: 1, strategic: 1, necessary: 1, prevent: 1,
        satisfaction: 3, quality: 1, accuracy: 1, innovationMeasure: 2,
        active: 3, selective: 1, formal: 1, work: 1,
        expert: 1, leader: 1, fullstackExpert: 1, impactVision: 2,
        salary: 1, balance: 2, learning: 1, autonomy: 2,
        innovationCulture: 2, stable: 1, impactCulture: 1, creativeCulture: 3
      }
    },
    "Product Manager": {
      icon: "fa-chart-pie",
      description: "Guide product development from concept to launch",
      salary: "₹4-8 LPA Entry, ₹8-15 LPA Mid-level",
      skills: ["Product Strategy", "User Research", "Analytics", "Communication"],
      course: "Product Management Basics",
      weights: {
        team: 3, mentor: 3, independent: 1, creative: 2,
        startup: 3, corporate: 2, remote: 2, hybrid: 2,
        pressure: 2, planner: 3, adaptive: 2, process: 2,
        impact: 3, growth: 2, stability: 2, innovation: 2,
        frontend: 1, backend: 1, data: 1, infrastructure: 1,
        buildAI: 1, useAI: 1, analyzeData: 1, traditional: 1,
        visual: 1, algorithmic: 1, architecture: 1, fullstack: 1,
        handsOn: 2, structured: 2, community: 2, theory: 1,
        breakdown: 1, research: 1, experiment: 1, collaborate: 3,
        detective: 1, strategic: 1, necessary: 1, prevent: 1,
        satisfaction: 3, quality: 1, accuracy: 1, innovationMeasure: 1,
        active: 2, selective: 1, formal: 1, work: 2,
        expert: 1, leader: 3, fullstackExpert: 1, impactVision: 1,
        salary: 1, balance: 2, learning: 1, autonomy: 3,
        innovationCulture: 2, stable: 1, impactCulture: 1, creativeCulture: 1
      }
    }
  };

  // Initialize quiz
  function initQuiz() {
    currentQuestion = 0;
    answers = {};
    updateQuestionDisplay();
    updateNavigation();
    updateProgress();
  }

  // Update question display
  console.log("updateQuestionDisplay called");
    const question = questions[currentQuestion];
    console.log("Setting question text:", question.text);
    console.log('Current question:', question, 'index:', currentQuestion);
    questionTitle.textContent = question.text;

    // Clear options
    console.log("Options container:", optionsContainer);
    optionsContainer.innerHTML = '';

    // Create options
    question.options.forEach(option => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'option';
      optionDiv.innerHTML = `
        <label>
          <input type="radio" name="option" value="${option.value}">
          <span>${option.text}</span>
        </label>
      `;
      // Add event listener after the element is inserted into DOM
      optionDiv.querySelector('input').addEventListener('change', () => {
        saveAnswer(question.id, option.value);
      });
      optionsContainer.appendChild(optionDiv);
    });

    // Update question counter
    document.getElementById('question-counter').textContent = `${currentQuestion + 1} / ${questions.length}`;
  }

  // Save answer
  function saveAnswer(questionId, value) {
    answers[questionId] = value;
    updateNavigation();
  }

  // Update navigation buttons
  function updateNavigation() {
    const question = questions[currentQuestion];
    const answered = answers[question.id] !== undefined;

    // Previous button
    prevBtn.disabled = currentQuestion === 0;

    // Next/Submit button
    if (currentQuestion === questions.length - 1) {
      // Last question
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-block';
      submitBtn.disabled = !answered;
    } else {
      // Not last question
      nextBtn.style.display = 'inline-block';
      submitBtn.style.display = 'none';
      nextBtn.disabled = !answered;
    }
  }

  // Update progress bar
  function updateProgress() {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  }

  // Navigate to next question
  function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      updateQuestionDisplay();
      updateProgress();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Navigate to previous question
  function previousQuestion() {
    if (currentQuestion > 0) {
      currentQuestion--;
      updateQuestionDisplay();
      updateProgress();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Calculate scores
  function calculateScores() {
    const scores = {};

    // Initialize scores for all careers
    Object.keys(careers).forEach(career => {
      scores[career] = 0;
    });

    // Add weights from answers
    Object.keys(answers).forEach(questionId => {
      const value = answers[questionId];
      const question = questions.find(q => q.id === parseInt(questionId));

      if (question) {
        Object.keys(careers).forEach(career => {
          scores[career] += careers[career].weights[value] || 0;
        });
      }
    });

    // Normalize to 0-100
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      Object.keys(scores).forEach(career => {
        scores[career] = Math.round((scores[career] / maxScore) * 100);
      });
    }

    return scores;
  }

  // Get top 3 careers
  function getTopCareers(scores, count = 3) {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([career, score]) => ({
        career,
        score
      }));
  }

  // Identify strengths from answers
  function identifyStrengths() {
    const strengthMap = {
      team: "Collaboration and teamwork",
      mentor: "Learning from experienced professionals",
      independent: "Self-directed work and focus",
      creative: "Creative problem-solving and innovation",
      startup: "Adaptability in fast-paced environments",
      corporate: "Process-oriented and structured approach",
      remote: "Self-motivation and autonomy",
      hybrid: "Flexibility in work arrangements",
      pressure: "Thriving under pressure and deadlines",
      planner: "Strategic planning and foresight",
      adaptive: "Flexibility and adaptability",
      process: "Following established procedures",
      impact: "User-focused and impact-driven",
      growth: "Continuous learning and development",
      stability: "Seeking security and predictability",
      innovation: "Pursuing cutting-edge technology",
      frontend: "Visual design and user experience",
      backend: "Server-side logic and system architecture",
      data: "Data analysis and interpretation",
      infrastructure: "Systems and infrastructure management",
      buildAI: "AI system development and engineering",
      useAI: "Practical AI application integration",
      analyzeData: "Data pattern recognition and analysis",
      traditional: "Preference for established technologies",
      visual: "Visual thinking and design orientation",
      algorithmic: "Logical and algorithmic problem solving",
      architecture: "System design and architectural thinking",
      fullstack: "Comprehensive full-stack development",
      handsOn: "Learning by doing and experimentation",
      structured: "Preference for guided learning",
      community: "Collaborative and community-based learning",
      theory: "Deep theoretical understanding",
      breakdown: "Analytical problem decomposition",
      research: "Solution research and investigation",
      experiment: "Experimental approach to problem-solving",
      collaborate: "Collaborative problem-solving approach",
      detective: "Enjoyment of investigative debugging",
      strategic: "Strategic and tool-based debugging",
      necessary: "Pragmatic approach to necessary tasks",
      prevent: "Proactive bug prevention mindset",
      satisfaction: "User satisfaction as success metric",
      quality: "Code quality and technical excellence",
      accuracy: "Data precision and analytical accuracy",
      innovationMeasure: "Innovation as success measure",
      active: "Proactive trend following and learning",
      selective: "Focused and relevant learning approach",
      formal: "Preference for structured education",
      work: "Learning through practical work experience",
      expert: "Aspiration for deep technical expertise",
      leader: "Desire for leadership and team management",
      fullstackExpert: "Goal of full-stack mastery",
      impactVision: "Wanting to make significant impact",
      salary: "Value on financial compensation",
      balance: "Priority on work-life balance",
      learning: "Emphasis on continuous growth",
      autonomy: "Desire for independence and decision-making",
      innovationCulture: "Preference for innovative environments",
      stable: "Desire for stability and predictability",
      impactCulture: "Motivation by social impact",
      creativeCulture: "Value on creative freedom"
    };

    const strengths = [];
    const uniqueValues = new Set(Object.values(answers));

    uniqueValues.forEach(value => {
      if (strengthMap[value] && !strengths.includes(strengthMap[value])) {
        strengths.push(strengthMap[value]);
      }
    });

    // Return top 4 strengths
    return strengths.slice(0, 4);
  }

  // Submit test
  async function submitTest() {
    // Check if all questions answered
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert('Please answer all questions before submitting.');
      return;
    }

    // Show loading
    quizContainer.style.display = 'none';
    loadingSpinner.style.display = 'block';

    try {
      // Call API
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/career-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save career test');
      }

      // Hide loading, show results
      loadingSpinner.style.display = 'none';
      resultsContainer.style.display = 'block';
      displayResults(result);
    } catch (error) {
      console.error('Career test error:', error);
      loadingSpinner.style.display = 'none';
      quizContainer.style.display = 'block';
      alert('Error: ' + error.message);
    }
  }

  // Display results
  function displayResults(result) {
    // Clear previous results
    resultsContent.innerHTML = '';

    // Display top 3 careers
    if (result.topCareers && result.topCareers.length > 0) {
      result.topCareers.forEach((careerObj, index) => {
        const career = careers[careerObj.career];
        if (!career) return;

        const careerCard = document.createElement('div');
        careerCard.className = 'career-card';
        careerCard.innerHTML = `
          <div class="career-icon">
            <i class="fas ${career.icon}"></i>
          </div>
          <div class="career-info">
            <h3>${careerObj.career}</h3>
            <div class="confidence">Confidence: <strong>${careerObj.score}%</strong></div>
            <p class="description">${career.description}</p>
            <div class="career-details">
              <div class="detail-item">
                <i class="fas fa-rupee-sign"></i> <span>${career.salary}</span>
              </div>
              <div class="detail-item">
                <i class="fas fa-signal"></i> <span>${career.skills.slice(0, 3).join(', ')}</span>
              </div>
            </div>
            <div class="suggested-course">
              <i class="fas fa-graduation-cap"></i> Suggested first course: <strong>${career.course}</strong>
            </div>
          </div>
        `;
        resultsContent.appendChild(careerCard);
      });
    }

    // Display strengths
    if (result.strengths && result.strengths.length > 0) {
      strengthsSection.style.display = 'block';
      strengthsList.innerHTML = '';
      result.strengths.forEach(strength => {
        const li = document.createElement('li');
        li.textContent = strength;
        strengthsList.appendChild(li);
      });
    } else {
      strengthsSection.style.display = 'none';
    }
  }

  // Retake test
  retakeBtn.addEventListener('click', () => {
    resultsContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    initQuiz();
  });

  // Event listeners
  prevBtn.addEventListener('click', previousQuestion);
  nextBtn.addEventListener('click', nextQuestion);
  submitBtn.addEventListener('click', submitTest);

  // Initialize quiz on load
  document.addEventListener('DOMContentLoaded', initQuiz);

  // Check auth
  let token = null;
  try {
    token = localStorage.getItem('token');
  } catch (e) {
    console.warn('Unable to access localStorage:', e);
    // Continue with token = null, which will trigger the login redirect
  }

  if (!token) {
    alert('Please log in first to take the career test.');
    window.location.href = 'login.html';
  }
})();