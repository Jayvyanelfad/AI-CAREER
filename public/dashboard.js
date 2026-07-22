// Dashboard Logic - Backend Version
(async function() {
  const userName = document.getElementById('user-name');
  const careerPathDiv = document.getElementById('career-path');
  const coursesDiv = document.getElementById('my-courses');
  const progressDiv = document.getElementById('my-progress');
  const certificatesDiv = document.getElementById('my-certificates');

  const token = localStorage.getItem('token');

  // Redirect if not logged in
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    // Fetch dashboard data from BACKEND
    const response = await fetch('http://localhost:5000/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to load dashboard');
    }

    const data = await response.json();

    // Set user name
    if (data.user && data.user.name) {
      userName.textContent = data.user.name;
    }

    // Career Path from DATABASE
    if (data.career) {
      careerPathDiv.innerHTML = `
        <div style="padding: var(--space-4); background: var(--primary-light); border-radius: var(--radius-md); border-left: 4px solid var(--primary);">
          <strong style="color: var(--primary); font-size: 1.1rem;">${data.career.career}</strong>
          <p style="color: var(--text-secondary); margin-top: var(--space-2); font-size: 0.9rem;">
            Confidence: ${data.career.confidence}% — Based on your career test taken on ${new Date(data.career.date).toLocaleDateString()}
          </p>
          <a href="career-test.html" style="font-size: 0.85rem; margin-top: var(--space-2); display: inline-block;">Retake Test</a>
        </div>
      `;
    } else {
      careerPathDiv.innerHTML = `
        <p style="color: var(--text-muted);">Take the <a href="career-test.html">Career Test</a> to get personalized recommendations.</p>
      `;
    }

    // My Courses from DATABASE
    if (data.courses && data.courses.length > 0) {
      coursesDiv.innerHTML = data.courses.map(e => `
        <div class="course-item">
          <span><i class="fas fa-book" style="color: var(--primary); margin-right: var(--space-2);"></i> ${e.course}</span>
          <span style="color: var(--text-muted); font-size: 0.85rem;">${e.progress || 0}%</span>
        </div>
        <div class="progress-bar" style="margin: 0 0 var(--space-3) 0;">
          <div style="width: ${e.progress || 0}%"></div>
        </div>
      `).join('');
    } else {
      coursesDiv.innerHTML = `
        <p style="color: var(--text-muted);">No courses enrolled yet. <a href="index.html#courses">Browse courses</a></p>
      `;
    }

    // Overall Progress from DATABASE
    progressDiv.innerHTML = `
      <div style="text-align: center; padding: var(--space-4);">
        <div style="font-size: 3rem; color: var(--primary); font-weight: 700;">${data.progress}%</div>
        <p style="color: var(--text-muted);">Overall Progress</p>
        <div class="progress-bar" style="margin-top: var(--space-4);">
          <div style="width: ${data.progress}%"></div>
        </div>
      </div>
    `;

    // Certificates from DATABASE
    if (data.certificates && data.certificates.length > 0) {
      certificatesDiv.innerHTML = data.certificates.map(c => `
        <div class="cert-item">
          <i class="fas fa-award"></i>
          <div>
            <strong>${c.course}</strong>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">${c.cert_id} · ${new Date(c.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      `).join('');
    } else {
      certificatesDiv.innerHTML = `
        <p style="color: var(--text-muted);">Complete courses to earn certificates!</p>
      `;
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    userName.textContent = 'Learner';
  }

  // Logout function
  window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };
})();
