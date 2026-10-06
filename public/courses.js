// Course data will be fetched from API
let allCourses = [];
let coursesMap = new Map(); // Map of courseId -> course data
const API_BASE = window.API_BASE || '/api';
const enrolledCourseIds = new Set();

function reflectEnrolledCourses() {
  document.querySelectorAll('.course-card[data-course-id]').forEach(courseCard => {
    if (!enrolledCourseIds.has(courseCard.dataset.courseId)) return;
    const enrollButton = courseCard.querySelector('.enroll-btn');
    if (!enrollButton) return;
    enrollButton.textContent = t('coverage.enrolled', 'Enrolled');
    enrollButton.classList.add('enrolled');
    enrollButton.disabled = true;
  });
}

document.addEventListener('careerpath:catalog-rendered', reflectEnrolledCourses);

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
      // The API reports access classification; difficulty alone never implies Pro.
      premium: Boolean(course.premium)
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
      enrolledCourseIds.clear();
      enrolledCourses.forEach(enrollment => {
        if (typeof enrollment.courseId === 'string') enrolledCourseIds.add(enrollment.courseId);
      });
      reflectEnrolledCourses();

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
    const modalPrompt = document.getElementById('modal-enroll-prompt');
    const enrollmentFeedback = document.getElementById('enrollment-feedback');
    let triggeringEnrollButton = null;

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
      const courseId = courseCard.dataset.courseId;
      const courseName = courseCard.dataset.courseName || courseCard.querySelector('h3').textContent;

      modalPrompt.textContent = t('coverage.confirmEnrollPrompt', 'Enroll in {course}?', {
        course: t(`courseMetadata.${courseId}.title`, courseName)
      }, true);
      enrollmentFeedback.hidden = true;
      enrollmentFeedback.textContent = '';
      confirmEnroll.disabled = false;
      confirmEnroll.textContent = t('common.enrollFree', 'Enroll Free');
      enrollmentFeedback.setAttribute('role', 'status');
      triggeringEnrollButton = btn;
      confirmEnroll.dataset.courseId = courseId;
      confirmEnroll.dataset.courseName = courseName;

      enrollModal.style.display = 'flex';
      confirmEnroll.focus();
    }, true);

    // Close modal function
    function closeEnrollmentModal() {
      if (enrollModal) {
        enrollModal.style.display = 'none';
      }
      if (triggeringEnrollButton?.isConnected) triggeringEnrollButton.focus();
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
      enrollModal.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeEnrollmentModal();
      });
    }

    // Confirm enrollment
    if (confirmEnroll) {
      confirmEnroll.addEventListener('click', async () => {
        const courseId = confirmEnroll.dataset.courseId;
        const courseName = confirmEnroll.dataset.courseName;

        if (!courseId || !courseName) {
          enrollmentFeedback.textContent = t('coverage.courseInfoMissing', 'Course information is unavailable. Close this dialog and try again.');
          enrollmentFeedback.hidden = false;
          return;
        }

        confirmEnroll.disabled = true;
        enrollmentFeedback.setAttribute('role', 'status');
        enrollmentFeedback.textContent = t('coverage.enrolling', 'Enrolling...');
        enrollmentFeedback.hidden = false;
        try {
          const response = await fetch(`${API_BASE}/enroll`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ courseId })
          });

          await response.json().catch(() => ({}));

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error(t('coverage.signInEnroll', 'Please sign in to enroll in this course.'));
            }
            if (response.status === 404 || response.status === 409) {
              throw new Error(t('coverage.enrollmentUnavailable', 'This course is not currently available for enrollment.'));
            }
            throw new Error(t('coverage.enrollmentFailed', 'Enrollment failed. Please try again.'));
          }

          // Update UI - change button state
          const courseCard = document.querySelector(`.course-card[data-course-id="${courseId}"]`);
          if (courseCard) {
            const enrollBtn = courseCard.querySelector('.enroll-btn');
            if (enrollBtn) {
              enrollBtn.textContent = t('coverage.enrolled', 'Enrolled');
              enrollBtn.classList.add('enrolled');
              enrollBtn.disabled = true;
            }
          }
          enrolledCourseIds.add(courseId);

          enrollmentFeedback.setAttribute('role', 'status');
          enrollmentFeedback.textContent = t('coverage.enrollmentSuccess', 'You are enrolled in {course}.', {
            course: t(`courseMetadata.${courseId}.title`, courseName)
          });
          confirmEnroll.textContent = t('coverage.enrolled', 'Enrolled');
          confirmEnroll.disabled = true;

        } catch (error) {
          console.error('Enrollment error:', error);
          enrollmentFeedback.setAttribute('role', 'alert');
          enrollmentFeedback.textContent = error.message || t('coverage.enrollmentFailed', 'Enrollment failed. Please try again.');
          confirmEnroll.disabled = false;
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
