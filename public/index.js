const FEATURED_COURSE_IDS = [
  'generative_ai_llm',
  'prompt_engineering',
  'ai_agents',
  'ai_software_engineering'
];

function createCourseCard(course) {
  const card = document.createElement('article');
  card.className = course.id === 'generative_ai_llm'
    ? 'home-course-card home-course-card-featured'
    : 'home-course-card';

  const figure = document.createElement('div');
  figure.className = 'home-course-image';
  figure.setAttribute('aria-hidden', 'true');

  if (typeof course.image_url === 'string' && course.image_url.trim()) {
    const image = document.createElement('img');
    image.src = course.image_url;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      figure.classList.add('home-course-image-fallback');
      image.remove();
    }, { once: true });
    figure.appendChild(image);
  } else {
    figure.classList.add('home-course-image-fallback');
  }

  const body = document.createElement('div');
  body.className = 'home-course-card-body';

  const category = document.createElement('p');
  category.className = 'home-course-category';
  category.textContent = course.category || 'Career learning';

  const title = document.createElement('h3');
  title.textContent = course.title;

  const description = document.createElement('p');
  description.className = 'home-course-description';
  description.textContent = course.description || '';

  const meta = document.createElement('p');
  meta.className = 'home-course-meta';
  const level = typeof course.level === 'string'
    ? course.level.charAt(0).toUpperCase() + course.level.slice(1)
    : '';
  const duration = Number(course.duration_weeks);
  meta.textContent = [level, duration > 0 ? `${duration} weeks` : ''].filter(Boolean).join(' · ');

  const action = document.createElement('a');
  action.className = 'home-course-link';
  action.href = `course-detail.html?id=${encodeURIComponent(course.id)}`;
  action.textContent = 'View course';
  action.setAttribute('aria-label', `View course: ${course.title}`);
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = ' →';
  action.appendChild(arrow);

  body.append(category, title, description, meta, action);
  card.append(figure, body);
  return card;
}

async function renderFeaturedCourses() {
  const grid = document.getElementById('home-course-grid');
  if (!grid) return;

  try {
    const response = await fetch(`${window.API_BASE || '/api'}/courses`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Course catalog returned ${response.status}`);

    const payload = await response.json();
    const courses = Array.isArray(payload.courses) ? payload.courses : [];
    const byId = new Map(courses.map(course => [course.id, course]));
    const featured = FEATURED_COURSE_IDS
      .map(id => byId.get(id))
      .filter(course => course && course.id && course.title);

    grid.replaceChildren();
    if (!featured.length) {
      const message = document.createElement('p');
      message.className = 'home-course-status';
      message.textContent = 'Course highlights are unavailable right now. Explore the full catalog instead.';
      grid.appendChild(message);
    } else {
      featured.forEach(course => grid.appendChild(createCourseCard(course)));
    }
  } catch (error) {
    console.error('Homepage course highlights could not be loaded:', error);
    const message = document.createElement('p');
    message.className = 'home-course-status';
    message.textContent = 'Course highlights are unavailable right now. Explore the full catalog instead.';
    grid.replaceChildren(message);
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

function initializeCookieNotice() {
  const banner = document.getElementById('cookie-banner');
  const acceptButton = document.getElementById('accept-cookies');
  if (!banner || !acceptButton) return;

  try {
    banner.hidden = localStorage.getItem('cookiesAccepted') === 'true';
  } catch (_error) {
    banner.hidden = false;
  }

  acceptButton.addEventListener('click', () => {
    try {
      localStorage.setItem('cookiesAccepted', 'true');
    } catch (_error) {
      // Keep the notice dismissible when storage is unavailable.
    }
    banner.hidden = true;
  });
}

renderFeaturedCourses();
initializeCookieNotice();
