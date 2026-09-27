// Course data will be fetched from API
let allCourses = [];
let coursesMap = new Map(); // Map of courseId -> course data
const API_BASE = window.API_BASE || '/api';

// Fetch courses from backend API
async function fetchCourses(token) {
  try {
    const response = await fetch(`${API_BASE}/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch courses: ${response.status}`);
    }

    const data = await response.json();
    // Transform API response to match expected UI format
    allCourses = data.courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      image: course.image_url,
      badge: course.level.charAt(0).toUpperCase() + course.level.slice(1), // Capitalize first letter
      weeks: course.duration_weeks,
      level: course.level,
      // Determine if premium based on level or other criteria
      premium: course.level === 'advanced'
    }));

    // Populate courses map for quick lookup
    coursesMap.clear();
    allCourses.forEach(course => {
      coursesMap.set(course.id, course);
    });
  } catch (error) {
    console.error('Error loading course data:', error);
    // Fallback to empty array - UI will show no courses
    allCourses = [];
    coursesMap.clear();
  }
}

// Courses Page Logic - only run on the courses page
(async function() {
  // Guard: only execute this logic on the courses.html page
  if (!/\/courses(?:\.html)?\/?$/i.test(window.location.pathname)) {
    return;
  }

  const token = await window.careerPathAuthReady;
  if (!token) return;
  await fetchCourses(token);

  // Remote catalog images can occasionally expire or reject a request. Keep
  // the course card intact and turn the image area into a deliberate fallback.
  const courseList = document.getElementById('course-list');
  if (courseList) {
    courseList.addEventListener('error', event => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.closest('.course-image')) return;
      const imagePanel = image.closest('.course-image');
      imagePanel.dataset.courseTitle = image.alt || 'Course';
      imagePanel.classList.add('course-image--fallback');
      image.remove();
    }, true);
  }

  const isAuthenticated = true;

  // Initialize course data from backend (only if authenticated, for enrollments)
  async function loadCourseData() {
    try {
      const response = await fetch(`${API_BASE}/enrollments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.warn('Could not load enrollments');
        return;
      }

      const data = await response.json();
      const enrolledCourses = data.enrollments || [];

      // Update UI for enrolled courses
      enrolledCourses.forEach(enrollment => {
        const courseCard = document.querySelector(`.course-card[data-course-id="${enrollment.courseId}"]`);
        if (courseCard) {
          const enrollBtn = courseCard.querySelector('.enroll-btn');
          if (enrollBtn) {
            enrollBtn.textContent = 'Enrolled';
            enrollBtn.classList.add('enrolled');
            enrollBtn.disabled = true;
          }
        }
      });

    } catch (error) {
      console.error('Error loading course data:', error);
    }
  }

  // Handle enrollment modal - runs after DOM is ready
  function setupEnrollmentModal() {
    // Get modal elements (now that DOM is ready)
    const enrollModal = document.getElementById('enroll-modal');
    const closeModal = document.querySelector('.close-modal');
    const cancelEnroll = document.getElementById('cancel-enroll');
    const confirmEnroll = document.getElementById('confirm-enroll');
    const modalCourseName = document.getElementById('modal-course-name');

    // Only proceed if user is authenticated and modal exists
    if (!isAuthenticated || !enrollModal) {
      return;
    }

    // Open enrollment modal when enroll button is clicked
    const freeCoursesContainer = document.getElementById('course-list');
    freeCoursesContainer.addEventListener('click', function(e) {
      const btn = e.target.closest('.enroll-btn');
      if (!btn) return;
      const courseCard = btn.closest('.course-card');
      const courseName = courseCard.querySelector('h3').textContent;
      const courseId = courseCard.dataset.courseId;

      modalCourseName.textContent = courseName;
      confirmEnroll.dataset.courseId = courseId;
      confirmEnroll.dataset.courseName = courseName;

      enrollModal.style.display = 'flex';
    });

    // Close modal function
    function closeEnrollmentModal() {
      if (enrollModal) {
        enrollModal.style.display = 'none';
      }
    }

    // Close modal when clicking close button or cancel button
    if (closeModal) {
      closeModal.addEventListener('click', closeEnrollmentModal);
    }
    if (cancelEnroll) {
      cancelEnroll.addEventListener('click', closeEnrollmentModal);
    }

    // Close when clicking outside modal content
    if (enrollModal) {
      enrollModal.addEventListener('click', (e) => {
        if (e.target === enrollModal) {
          closeEnrollmentModal();
        }
      });
    }

    // Confirm enrollment
    if (confirmEnroll) {
      confirmEnroll.addEventListener('click', async () => {
        const courseId = confirmEnroll.dataset.courseId;
        const courseName = confirmEnroll.dataset.courseName;

        if (!courseId || !courseName) {
          alert('Course information missing');
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/enroll`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              courseId,
              courseName,
              totalHours: 40 // Default hours
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Enrollment failed');
          }

          // Update UI - change button state
          const courseCard = document.querySelector(`.course-card[data-course-id="${courseId}"]`);
          if (courseCard) {
            const enrollBtn = courseCard.querySelector('.enroll-btn');
            if (enrollBtn) {
              enrollBtn.textContent = 'Enrolled';
              enrollBtn.classList.add('enrolled');
              enrollBtn.disabled = true;
            }
          }

          closeEnrollmentModal();
          alert(`Successfully enrolled in ${courseName}!`);

        } catch (error) {
          console.error('Enrollment error:', error);
          alert('Error: ' + error.message);
        }
      });
    }
  }

  // Set up enrollment modal based on DOM readiness
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEnrollmentModal);
  } else {
    setupEnrollmentModal();
  }

  // Load enrolled courses on page load (only if authenticated)
  if (isAuthenticated) {
    loadCourseData();
  }

})();
