// Dashboard Logic - Backend Version (Supabase-powered)
(async function() {
  const userName = document.getElementById('user-name');
  const careerGoal = document.getElementById('career-goal');
  const dashboardMessage = document.getElementById('dashboard-message');
  const statsGrid = document.getElementById('stats-grid');
  const careerSummary = document.getElementById('career-summary');
  const coursesGrid = document.getElementById('courses-grid');
  const timelineContainer = document.getElementById('timeline-container');
  const activityFeed = document.getElementById('activity-feed');
  const takeCareerTestBtn = document.getElementById('take-career-test-btn');
  const exploreCoursesBtn = document.getElementById('explore-courses-btn');
  const viewProfileBtn = document.getElementById('view-profile-btn');
  const floatingChatbot = document.getElementById('floating-chatbot');

  const token = localStorage.getItem('token');

  // Check if DOM is ready, if not wait for it
  async function initializeDashboard() {
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to load dashboard');
    }

    const data = await response.json();

    // Greeting
    if (data.user && data.user.name) {
      userName.textContent = data.user.name;
    }
    if (data.user && data.user.careerGoal) {
      careerGoal.textContent = ` - ${data.user.careerGoal}`;
      dashboardMessage.textContent = `Keep going, ${data.user.name}! You're on your way to becoming a ${data.user.careerGoal}.`;
    } else {
      dashboardMessage.textContent = `Take the career test to discover your ideal tech career path.`;
    }

    // Stats Cards
    if (data.stats) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <span class="stat-number">${data.stats.coursesEnrolled}</span>
          <span class="stat-label">Courses Enrolled</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${data.stats.overallProgress}%</span>
          <span class="stat-label">Overall Progress</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${data.stats.streak}</span>
          <span class="stat-label">Day Streak</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${data.stats.certificatesEarned}</span>
          <span class="stat-label">Certificates Earned</span>
        </div>
      `;
    }

    // Career Test Summary
    if (data.careerTest && data.careerTest.completed) {
      const topCareers = data.careerTest.topCareers || [];
      const strengths = data.careerTest.strengths || [];
      careerSummary.innerHTML = `
        <div class="career-recommendations">
          ${topCareers.map((career, index) => `
            <div class="career-card">
              <h4>${career}</h4>
              <div class="career-confidence">
                <span>Confidence:</span>
                <span>${Math.max(95 - index * 10, 65)}%</span>
              </div>
              ${strengths.length > 0 ? `
                <div class="career-strengths">
                  Strengths: ${strengths.join(', ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ${data.careerTest.learningPath ? `
          <p style="margin-top: var(--space-3); color: var(--text-muted); font-style: italic;">
            Learning path: ${data.careerTest.learningPath}
          </p>
        ` : ''}
      `;
    } else {
      careerSummary.innerHTML = `
        <p style="color: var(--text-muted); text-align: center;">
          Take the <a href="career-test.html">Career Test</a> to get personalized career recommendations.
        </p>
      `;
    }

    // Enrolled Courses Grid
    if (data.enrollments && data.enrollments.length > 0) {
      coursesGrid.innerHTML = data.enrollments.map(enrollment => `
        <div class="course-card">
          <div class="course-header">
            <h3 class="course-title">${enrollment.courseName}</h3>
            <div class="course-meta">
              <span>${enrollment.progress}% Complete</span>
              <span>${enrollment.completedHours}h / ${enrollment.totalHours}h</span>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${enrollment.progress}%"></div>
          </div>
          <div class="course-actions">
            <a href="course-detail.html?id=${enrollment.courseId}" class="btn-outline">Continue Learning</a>
            <span class="text-muted">Next: ${enrollment.nextLessonTitle}</span>
          </div>
        </div>
      `).join('');
    } else {
      coursesGrid.innerHTML = `
        <p style="color: var(--text-muted); text-align: center; grid-column: 1 / -1;">
          No courses enrolled yet. <a href="courses.html">Browse courses</a> to get started.
        </p>
      `;
    }

    // Timeline Milestone (using mock data for now - in future would come from backend)
    if (data.timeline) {
      timelineContainer.innerHTML = data.timeline.map((item, index) => `
        <div class="timeline-item ${index % 2 === 0 ? 'odd' : 'even'}">
          <div class="timeline-icon">
            ${item.icon}
          </div>
          <div class="timeline-content">
            <h4>${item.title}</h4>
            <p class="timeline-date">${item.date}</p>
            <p>${item.description}</p>
          </div>
        </div>
      `).join('');
    } else {
      // Default timeline items
      timelineContainer.innerHTML = `
        <div class="timeline-item odd">
          <div class="timeline-icon"><i class="fas fa-rocket"></i></div>
          <div class="timeline-content">
            <h4>Started Journey</h4>
            <p class="timeline-date">Just begun</p>
            <p>Welcome to CareerPath AI! You've taken your first step toward discovering your ideal tech career.</p>
          </div>
        </div>
        <div class="timeline-item even">
          <div class="timeline-icon"><i class="fas fa-clipboard-list"></i></div>
          <div class="timeline-content">
            <h4>Career Assessment Completed</h4>
            <p class="timeline-date">In progress</p>
            <p>You've discovered your potential career path through our AI-powered assessment.</p>
          </div>
        </div>
        <div class="timeline-item odd">
          <div class="timeline-icon"><i class="fas fa-school"></i></div>
          <div class="timeline-content">
            <h4>First Course Enrolled</h4>
            <p class="timeline-date">Coming soon</p>
            <p>Begin your learning journey with your first recommended course.</p>
          </div>
        </div>
        <div class="timeline-item even">
          <div class="timeline-icon"><i class="fas fa-code"></i></div>
          <div class="timeline-content">
            <h4>Skill Milestone</h4>
            <p class="timeline-date">Coming soon</p>
            <p>Complete your first skill assessment and earn a badge.</p>
          </div>
        </div>
        <div class="timeline-item odd">
          <div class="timeline-icon"><i class="fas fa-graduation-cap"></i></div>
          <div class="timeline-content">
            <h4>Career Ready</h4>
            <p class="timeline-date">Goal</p>
            <p>Achieve your career goal and be ready for your first tech role.</p>
          </div>
        </div>
      `;
    }

    // Recent Activity Feed
    if (data.recentActivity && data.recentActivity.length > 0) {
      activityFeed.innerHTML = data.recentActivity.map(activity => `
        <div class="activity-item">
          <div class="activity-icon">
            ${activity.icon || '<i class="fas fa-circle"></i>'}
          </div>
          <div class="activity-content">
            <p class="action-text">${activity.action}</p>
            <p class="action-details">${activity.details}</p>
          </div>
        </div>
      `).join('');
    } else {
      activityFeed.innerHTML = `
        <p style="color: var(--text-muted); text-align: center;">
          No recent activity. Start by taking the career test or enrolling in a course.
        </p>
      `;
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    userName.textContent = 'Learner';
    dashboardMessage.textContent = 'Unable to load dashboard data. Please try again later.';
  }

  // Quick action button event listeners
  takeCareerTestBtn.addEventListener('click', () => {
    window.location.href = 'career-test.html';
  });

  exploreCoursesBtn.addEventListener('click', () => {
    window.location.href = 'courses.html';
  });

  viewProfileBtn.addEventListener('click', () => {
    window.location.href = 'profile.html';
  });

  // Floating chatbot button
  floatingChatbot.addEventListener('click', () => {
    window.location.href = 'ai-chat.html';
  });

  // Logout — signs out of Supabase too, not just clearing localStorage
  window.logout = async function() {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };
}

    // Initialize dashboard
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
      // DOM already ready
      initializeDashboard();
    }
  })();