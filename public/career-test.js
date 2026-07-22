// Career Test Logic - Backend Version
(function() {
  const form = document.getElementById('career-test-form');
  const resultDiv = document.getElementById('result');
  const recommendationP = document.getElementById('recommendation');
  const coursesDiv = document.getElementById('recommended-courses');

  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(form);
    const answers = {};
    formData.forEach((value, key) => { answers[key] = value; });

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in first to take the career test.');
      window.location.href = 'login.html';
      return;
    }

    try {
      // Send to BACKEND
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

      // Experience level modifier
      let experienceText = '';
      if (answers.q3 === 'beginner') {
        experienceText = 'We recommend starting with our free beginner courses to build a strong foundation.';
      } else if (answers.q3 === 'some') {
        experienceText = 'You have a good foundation. Our intermediate courses will help you level up.';
      } else {
        experienceText = 'With your experience, our advanced courses will take you to the next level.';
      }

      // Display result
      form.style.display = 'none';
      resultDiv.style.display = 'block';
      resultDiv.scrollIntoView({ behavior: 'smooth' });

      recommendationP.innerHTML = `
        <strong style="font-size: 1.5rem; color: var(--primary); display: block; margin-bottom: var(--space-4);">
          ${result.career}
        </strong>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
          Confidence: <strong>${result.confidence}%</strong> — ${experienceText}
        </p>
      `;

      coursesDiv.innerHTML = `
        <h3 style="margin-bottom: var(--space-4); color: var(--text);"><i class="fas fa-graduation-cap"></i> Recommended Courses</h3>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${result.courses.map(c => `
            <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border-light);">
              <i class="fas fa-check-circle" style="color: var(--success);"></i>
              <span>${c}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: var(--space-6);">
          <a href="dashboard.html" class="explore-btn" style="display: inline-block; padding: var(--space-3) var(--space-8);">
            <i class="fas fa-chart-line"></i> View Dashboard
          </a>
        </div>
      `;

    } catch (error) {
      console.error('Career test error:', error);
      alert('Error: ' + error.message);
    }
  });
})();
