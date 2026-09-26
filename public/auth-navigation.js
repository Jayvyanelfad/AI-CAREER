// Keep the duplicated page navbars in sync with the current Supabase session.
(function () {
  const coreLinks = [
    { href: 'index.html', label: 'Home', key: 'nav.home' },
    { href: 'career-test.html', label: 'Career Test', key: 'nav.careerTest' },
    { href: 'courses.html', label: 'Courses', key: 'nav.courses' },
    { href: 'dashboard.html', label: 'Dashboard', key: 'nav.dashboard', authenticated: true },
    { href: 'profile.html', label: 'Profile', key: 'nav.profile', authenticated: true },
    { href: 'login.html', label: 'Login', key: 'nav.login', unauthenticated: true }
  ];
  let currentAuthenticated = false;

  function translatedLinkLabel(definition) {
    // Keep the shared shell in English until every destination has complete UI translations.
    return definition.label;
  }

  function normalizedHref(anchor) {
    try {
      const url = new URL(anchor.getAttribute('href'), window.location.href);
      return url.pathname.split('/').pop().toLowerCase();
    } catch (_error) {
      return '';
    }
  }

  function isLogoutLink(anchor) {
    return /logout/i.test(anchor.textContent || '') ||
      /logout\s*\(/i.test(anchor.getAttribute('onclick') || '') ||
      normalizedHref(anchor) === 'javascript:void(0)';
  }

  function makeLink(container, definition) {
    const existing = Array.from(container.querySelectorAll('a'))
      .find(anchor => normalizedHref(anchor) === definition.href && !isLogoutLink(anchor));

    if (existing) {
      existing.textContent = translatedLinkLabel(definition);
      existing.removeAttribute('onclick');
      if (normalizedHref(existing) === window.location.pathname.split('/').pop().toLowerCase()) {
        existing.classList.add('w--current');
        existing.setAttribute('aria-current', 'page');
      } else {
        existing.classList.remove('w--current');
        existing.removeAttribute('aria-current');
      }
      return existing;
    }

    const anchor = document.createElement('a');
    anchor.href = definition.href;
    anchor.textContent = translatedLinkLabel(definition);
    anchor.className = 'text-menu color-bege_light nav-item';
    if (normalizedHref(anchor) === window.location.pathname.split('/').pop().toLowerCase()) {
      anchor.classList.add('w--current');
      anchor.setAttribute('aria-current', 'page');
    }
    return anchor;
  }

  function renderNavGroup(container, authenticated, externalLogin = false) {
    if (!container) return;

    const desktopLogin = externalLogin
      ? container.parentElement.querySelector(':scope > a.header-book-link-buttom') ||
        container.querySelector(':scope > .auth-external-login')
      : null;

    const links = coreLinks
      .filter(link => !link.authenticated || authenticated)
      .filter(link => !link.unauthenticated || !authenticated)
      .filter(link => !externalLogin || !link.unauthenticated)
      .map(link => makeLink(container, link));

    links.forEach(anchor => anchor.classList.add('nav-item'));

    if (desktopLogin) {
      desktopLogin.href = 'login.html';
      desktopLogin.removeAttribute('onclick');
      desktopLogin.classList.add('auth-external-login', 'nav-item');
      const label = desktopLogin.querySelector('.text-button');
      if (label) label.textContent = 'Login';
      else desktopLogin.textContent = 'Login';
      desktopLogin.hidden = authenticated;
    }

    let themeButton = container.querySelector('.theme-toggle') || document.querySelector('.theme-toggle');
    if (!themeButton) {
      themeButton = document.createElement('button');
      themeButton.type = 'button';
    }
    themeButton.type = 'button';
    themeButton.removeAttribute('id');
    themeButton.removeAttribute('style');
    themeButton.replaceChildren();
    themeButton.className = 'theme-toggle auth-theme-toggle nav-item';
    container.replaceChildren(...links, ...(desktopLogin ? [desktopLogin] : []), themeButton);
    if (typeof window.refreshCareerPathTheme === 'function') window.refreshCareerPathTheme();
  }

  function setupResponsiveNavigation() {
    const groups = new Set(document.querySelectorAll('.div-block-2, header nav'));
    let index = 0;

    groups.forEach(group => {
      const brandedWrapper = group.classList.contains('div-block-2')
        ? group.closest('.nav-wrapper')
        : null;
      const host = brandedWrapper || group.closest('header');
      if (!host) return;

      host.classList.add('auth-nav-responsive');
      group.classList.add('auth-responsive-nav');
      group.id = group.id || `auth-responsive-nav-${++index}`;

      let toggle = brandedWrapper && brandedWrapper.querySelector(':scope > .menu-button');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'auth-nav-toggle';
        toggle.textContent = 'Menu';
        if (brandedWrapper) {
          brandedWrapper.insertBefore(toggle, group.nextSibling);
        } else {
          group.parentElement.insertBefore(toggle, group);
        }
      }

      toggle.classList.add('auth-nav-toggle');
      toggle.textContent = 'Menu';
      toggle.setAttribute('aria-label', 'Open navigation');
      toggle.setAttribute('aria-controls', group.id);
      toggle.setAttribute('aria-expanded', 'false');
      if (toggle.tagName.toLowerCase() !== 'button') {
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('tabindex', '0');
      }

      const close = () => {
        host.classList.remove('auth-mobile-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
        toggle.textContent = 'Menu';
      };
      const open = () => {
        host.classList.add('auth-mobile-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close navigation');
        toggle.textContent = 'Close';
      };

      toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        host.classList.contains('auth-mobile-open') ? close() : open();
      });
      toggle.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && toggle.tagName.toLowerCase() !== 'button') {
          event.preventDefault();
          host.classList.contains('auth-mobile-open') ? close() : open();
        }
      });
      group.addEventListener('click', event => {
        if (event.target.closest('a')) close();
      });
      document.addEventListener('click', event => {
        if (host.classList.contains('auth-mobile-open') && !host.contains(event.target)) close();
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && host.classList.contains('auth-mobile-open')) {
          close();
          toggle.focus();
        }
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 767) {
        document.querySelectorAll('.auth-mobile-open').forEach(element => element.classList.remove('auth-mobile-open'));
        document.querySelectorAll('.auth-nav-toggle[aria-expanded="true"]').forEach(toggle => {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-label', 'Open navigation');
          toggle.textContent = 'Menu';
        });
      }
    });
  }

  function renderNavigation(authenticated) {
    currentAuthenticated = Boolean(authenticated);
    const desktopGroups = new Set();
    document.querySelectorAll('.div-block-2, header > nav').forEach(group => desktopGroups.add(group));
    desktopGroups.forEach(group => {
      const hasExternalLogin = group.matches('.div-block-2') &&
        Boolean(group.parentElement.querySelector(':scope > a.header-book-link-buttom') ||
          group.querySelector(':scope > .auth-external-login'));
      renderNavGroup(group, authenticated, hasExternalLogin);
    });

    // Branded pages place Login beside the desktop link group.
    document.querySelectorAll('[data-auth-only]').forEach(element => {
      element.hidden = !authenticated;
    });
  }

  function clearStoredAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userSettings');
  }

  async function getCurrentAccessToken() {
    const auth = window.supabase && window.supabase.auth;
    if (!auth) return null;

    let token = null;
    try {
      const { data, error } = await auth.getSession();
      if (!error && data && data.session && data.session.access_token) {
        token = data.session.access_token;
        // Keep the existing Bearer-token API contract aligned with the latest
        // Supabase session token, including after an automatic token refresh.
        localStorage.setItem('token', token);
        return token;
      }
    } catch (error) {
      console.warn('Could not read the Supabase session:', error);
    }

    // Validate a legacy access-token-only login with Supabase when there is no
    // persisted session. New password logins establish a refreshable session.
    token = token || localStorage.getItem('token');
    if (!token) return null;

    try {
      const { data, error } = await auth.getUser(token);
      const user = data && data.user;
      if (error || !user) {
        if (error && [400, 401, 403].includes(Number(error.status))) clearStoredAuth();
        return null;
      }
      return token;
    } catch (error) {
      console.warn('Could not validate the Supabase session:', error);
      return null;
    }
  }

  window.getAuthAccessToken = getCurrentAccessToken;

  async function resolveAuthenticatedSession() {
    renderNavigation(Boolean(await getCurrentAccessToken()));
  }

  window.logout = async function () {
    try {
      if (window.supabase && window.supabase.auth) {
        await window.supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStoredAuth();
      window.location.href = 'index.html';
    }
  };

  document.addEventListener('click', event => {
    const logoutButton = event.target.closest('[data-logout]');
    if (logoutButton) {
      event.preventDefault();
      window.logout();
    }
  });

  function initialize() {
    setupResponsiveNavigation();
    resolveAuthenticatedSession();

    if (window.supabase && window.supabase.auth) {
      window.supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
          if (session.access_token) localStorage.setItem('token', session.access_token);
          renderNavigation(true);
        } else {
          if (event === 'SIGNED_OUT') clearStoredAuth();
          renderNavigation(false);
        }
      });
    }

    window.addEventListener('storage', event => {
      if (event.key === 'token') resolveAuthenticatedSession();
    });

    document.addEventListener('careerpath:language-change', () => renderNavigation(currentAuthenticated));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
