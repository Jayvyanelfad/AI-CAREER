// Dashboard Logic - Backend Version (Supabase-powered)
(async function() {
  const API_BASE = window.API_BASE || '/api';
  const userName = document.getElementById('user-name');
  const careerGoal = document.getElementById('career-goal');
  const dashboardAvatarFallback = document.getElementById('dashboard-avatar-fallback');
  const dashboardAvatarImage = document.getElementById('dashboard-avatar-image');
  const dashboardMessage = document.getElementById('dashboard-message');
  const statsGrid = document.getElementById('stats-grid');
  const careerSummary = document.getElementById('career-summary');
  const coursesGrid = document.getElementById('courses-grid');
  const certificatesGrid = document.getElementById('certificates-grid');
  const timelineContainer = document.getElementById('timeline-container');
  const activityFeed = document.getElementById('activity-feed');
  const takeCareerTestBtn = document.getElementById('take-career-test-btn');
  const exploreCoursesBtn = document.getElementById('explore-courses-btn');
  const viewProfileBtn = document.getElementById('view-profile-btn');
  const floatingChatbot = document.getElementById('floating-chatbot');

  if (coursesGrid) {
    coursesGrid.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.closest('.dashboard-course-image')) return;
      const imagePanel = image.closest('.dashboard-course-image');
      imagePanel.dataset.courseTitle = image.alt || 'Course';
      imagePanel.classList.add('dashboard-course-image--fallback');
      image.remove();
    }, true);
  }

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
        dashboardAvatarFallback.textContent = data.user.name.trim().slice(0, 1).toLocaleUpperCase() || 'C';
        dashboardAvatarImage.hidden = true;
        dashboardAvatarImage.onload = () => { dashboardAvatarImage.hidden = false; };
        dashboardAvatarImage.onerror = () => { dashboardAvatarImage.hidden = true; };
        if (data.user.avatarUrl) dashboardAvatarImage.src = data.user.avatarUrl;
        else dashboardAvatarImage.removeAttribute('src');
        window.updateCareerPathProfileIdentity?.(data.user);
      }
      if (data.user && data.user.careerGoal) {
        careerGoal.textContent = ` - ${data.user.careerGoal}`;
        dashboardMessage.textContent = t('coverage.greetingKeepGoing', "Keep going, {name}! You're on your way to becoming a {goal}.", { name: data.user.name, goal: data.user.careerGoal });
      } else {
        dashboardMessage.textContent = t('coverage.takeTestDiscover', 'Take the career test to discover your ideal tech career path.');
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
            <span class="stat-number">${data.stats.streak === null || data.stats.streak === undefined ? t('coverage.notTracked', 'Not tracked') : data.stats.streak}</span>
            <span class="stat-label">Day Streak</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${data.stats.certificatesEarned}</span>
            <span class="stat-label">Certificates Earned</span>
          </div>
        `;
      }

      // Career Test Summary
      if (data.careerTest && data.careerTest.completed &&
          data.careerTest.assessmentVersion === 'career-profile-v1' &&
          data.careerTest.dimensionScores) {
        const topCareers = data.careerTest.topCareers || [];
        const strengths = data.careerTest.strengths || [];
        careerSummary.innerHTML = `
          <div class="career-recommendations">
            ${topCareers.map((career) => {
              // /api/dashboard returns topCareers as [{ career, score }]; older rows in the
              // career_test table stored plain strings, so accept both shapes.
              const careerName = (career && typeof career === 'object') ? career.career : career;
              const careerScore = (career && typeof career === 'object') ? career.score : null;
              return `
              <div class="career-card">
                <h4>${careerName}</h4>
                ${careerScore !== null && careerScore !== undefined ? `
                <div class="career-confidence">
                  <span>Career alignment:</span>
                  <span>${careerScore}%</span>
                </div>
                ` : ''}
                ${strengths.length > 0 ? `
                  <div class="career-strengths">
                    ${t('coverage.strengthsLabel', 'Strengths:')} ${strengths.join(', ')}
                  </div>
                ` : ''}
              </div>
            `;
            }).join('')}
          </div>
          ${data.careerTest.learningPath ? `
            <p style="margin-top: var(--space-3); color: var(--text-muted); font-style: italic;">
              ${t('coverage.learningPathLabel', 'Learning path:')} ${data.careerTest.learningPath}
            </p>
          ` : ''}
        `;
      } else {
        careerSummary.innerHTML = `
          <p style="color: var(--text-muted); text-align: center;">
            ${t('coverage.profileIncomplete', 'Career Profile not completed yet.')} <a href="career-test.html">${t('coverage.completeCareerTestLink', 'Complete the Career Assessment')}</a> ${t('coverage.assessmentProfileBuild', 'Complete the Career Assessment to build your career profile.')}
          </p>
        `;
      }

      // Enrolled Courses Grid
      if (data.enrollments && data.enrollments.length > 0) {
        // Course artwork is presentation data from the existing catalog endpoint.
        // If it is unavailable, the learning cards still render as before.
        const courseImageById = new Map();
        try {
          const catalogResponse = await fetch(`${API_BASE}/courses`);
          if (catalogResponse.ok) {
            const catalogData = await catalogResponse.json();
            (Array.isArray(catalogData.courses) ? catalogData.courses : []).forEach(course => {
              if (course && course.id && typeof course.image_url === 'string' && course.image_url.trim()) {
                courseImageById.set(course.id, course.image_url.trim());
              }
            });
          }
        } catch (error) {
          // Course images are an enhancement; dashboard data remains usable.
        }

        coursesGrid.innerHTML = data.enrollments.map(enrollment => `
          <div class="course-card"${courseImageById.has(enrollment.courseId) ? ` data-course-image="${courseImageById.get(enrollment.courseId)}"` : ''}>
            ${courseImageById.has(enrollment.courseId) ? `<div class="dashboard-course-image"><img src="${courseImageById.get(enrollment.courseId)}" alt="${t(`courseMetadata.${enrollment.courseId}.title`, enrollment.courseName)}" loading="lazy"></div>` : ''}
            <div class="course-header">
              <h3 class="course-title">${t(`courseMetadata.${enrollment.courseId}.title`, enrollment.courseName)}</h3>
              <div class="course-meta">
                <span>${t('coverage.percentComplete', '{percent}% Complete', { percent: enrollment.progress })}</span>
                <span>${enrollment.completedHours}h / ${enrollment.totalHours}h</span>
              </div>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${enrollment.progress}%"></div>
            </div>
            <div class="course-actions">
              <a href="course-detail.html?id=${enrollment.courseId}" class="btn-outline">Continue Learning</a>
              <span class="text-muted">${t('coverage.nextLessonLabel', 'Next: {lesson}', { lesson: enrollment.nextLessonTitle })}</span>
            </div>
          </div>
        `).join('');
      } else {
        coursesGrid.innerHTML = `
          <p style="color: var(--text-muted); text-align: center; grid-column: 1 / -1;">
            ${t('coverage.noCoursesYet', 'No courses enrolled yet.')} <a href="courses.html">${t('coverage.browseCourses', 'Browse courses')}</a> ${t('coverage.toGetStarted', 'to get started.')}
          </p>
        `;
      }

      // Only render issued database records, and build text/links with DOM APIs.
      certificatesGrid.replaceChildren();
      const certificates = Array.isArray(data.certificates) ? data.certificates : [];
      if (certificates.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted';
        empty.textContent = t('coverage.passedCertificatesEmpty', 'Passed course certificates will appear here.');
        certificatesGrid.appendChild(empty);
      } else {
        certificates.forEach(certificate => {
          if (!certificate || typeof certificate.id !== 'string') return;
          const card = document.createElement('article');
          card.className = 'course-card certificate-dashboard-card';
          const title = document.createElement('h4');
          title.className = 'course-title';
          title.textContent = certificate.course_name || 'CareerPath AI Certificate';
          card.appendChild(title);
          if (certificate.earned_at) {
            const date = new Date(certificate.earned_at);
            if (Number.isFinite(date.getTime())) {
              const issued = document.createElement('p');
              issued.className = 'text-muted';
              issued.textContent = t('coverage.issuedDate', 'Issued {date}', { date: new Intl.DateTimeFormat(document.documentElement.lang).format(date) });
              card.appendChild(issued);
            }
          }
          const link = document.createElement('a');
          link.className = 'btn-outline';
          link.href = `certificate.html?certificateId=${encodeURIComponent(certificate.id)}`;
          link.textContent = t('coverage.viewCertificate', 'View Certificate');
          card.appendChild(link);
          certificatesGrid.appendChild(card);
        });
      }

      // Timeline Milestone (using mock data for now - in future would come from backend)
      if (Array.isArray(data.timeline) && data.timeline.length > 0) {
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
        timelineContainer.innerHTML = '<p class="text-muted">No recorded milestones yet.</p>';
      }

      // Recent Activity Feed
      if (data.recentActivity && data.recentActivity.length > 0) {
        activityFeed.innerHTML = data.recentActivity.map(activity => {
          // Map activity types to icons and descriptions
          let icon = '<i class="fas fa-circle"></i>';
          let action = activity.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          let details = activity.description;

          // Customize based on activity type
          switch (activity.type) {
            case 'login':
              icon = '<i class="fas fa-sign-in-alt"></i>';
              action = t('coverage.loggedIn', 'Logged In');
              break;
            case 'register':
              icon = '<i class="fas fa-user-plus"></i>';
              action = t('coverage.accountCreated', 'Account Created');
              break;
            case 'career_test':
              icon = '<i class="fas fa-star"></i>';
              action = t('coverage.careerTestCompleted', 'Career Test Completed');
              break;
            case 'enrollment':
              icon = '<i class="fas fa-book-open"></i>';
              action = t('coverage.courseEnrolled', 'Course Enrolled');
              break;
            case 'progress':
              icon = '<i class="fas fa-tasks"></i>';
              action = t('coverage.progressUpdated', 'Progress Updated');
              break;
            case 'certificate':
              icon = '<i class="fas fa-graduation-cap"></i>';
              action = t('coverage.certificateEarned', 'Certificate Earned');
              break;
            case 'chat':
              icon = '<i class="fas fa-robot"></i>';
              action = t('coverage.aiConversation', 'AI Conversation');
              break;
            default:
              icon = '<i class="fas fa-circle"></i>';
              action = activity.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          }

          // Format timestamp
          let timestampStr = '';
          if (activity.timestamp) {
            const date = new Date(activity.timestamp);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
              timestampStr = t('coverage.today', 'Today');
            } else if (diffDays === 1) {
              timestampStr = t('coverage.yesterday', 'Yesterday');
            } else if (diffDays < 7) {
              timestampStr = t('coverage.daysAgo', '{count} days ago', { count: diffDays });
            } else {
              timestampStr = date.toLocaleDateString();
            }
          }

          return `
            <div class="activity-item">
              <div class="activity-icon">
                ${icon}
              </div>
              <div class="activity-content">
                <p class="action-text">${action}</p>
                <p class="action-details">${details}</p>
                <p class="action-time">${timestampStr}</p>
              </div>
            </div>
          `;
        }).join('');
      } else {
        activityFeed.innerHTML = `
          <p style="color: var(--text-muted); text-align: center;">
            ${t('coverage.noRecentActivity', 'No recent activity. Start by taking the career test or enrolling in a course.')}
          </p>
        `;
      }

    } catch (error) {
      console.error('Dashboard error:', error);
      userName.textContent = 'Learner';
      dashboardMessage.textContent = t('coverage.loadDashboardError', 'Unable to load dashboard data. Please try again later.');
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
  }

  // Initialize dashboard
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
  } else {
    // DOM already ready
    initializeDashboard();
  }
})();
