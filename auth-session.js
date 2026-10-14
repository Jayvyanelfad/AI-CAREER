'use strict';

const express = require('express');

const AUTH_COOKIE_NAME = 'cp_auth_access';
const PROTECTED_PAGE_PATHS = new Set([
  '/courses', '/courses.html',
  '/course-detail', '/course-detail.html',
  '/programming', '/programming.html',
  '/dashboard', '/dashboard.html',
  '/profile', '/profile.html',
  '/career-test', '/career-test.html',
  '/exam', '/exam.html',
  '/certificate', '/certificate.html',
  '/admin', '/admin.html'
]);

function requestProtocol(req) {
  const forwarded = req.get('x-forwarded-proto');
  return String(forwarded || req.protocol || 'http').split(',')[0].trim().toLowerCase();
}

function isSameOrigin(req) {
  const origin = req.get('origin');
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  if (!origin || !host) return false;
  try {
    const supplied = new URL(origin);
    const expected = new URL(requestProtocol(req) + '://' + host);
    return supplied.origin === expected.origin;
  } catch (_error) {
    return false;
  }
}

function readCookie(req, name = AUTH_COOKIE_NAME) {
  const raw = req.headers.cookie;
  if (typeof raw !== 'string' || !raw) return null;
  for (const part of raw.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim() || null;
    }
  }
  return null;
}

function accessTokenExpiry(accessToken) {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const expiry = Number(claims.exp);
    return Number.isFinite(expiry) ? expiry : null;
  } catch (_error) {
    return null;
  }
}

function setSessionCookie(res, req, accessToken, maxAgeSeconds) {
  const attributes = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + String(Math.max(0, Math.floor(maxAgeSeconds)))
  ];
  if (requestProtocol(req) === 'https' || process.env.NODE_ENV === 'production') attributes.push('Secure');
  res.setHeader('Set-Cookie', AUTH_COOKIE_NAME + '=' + accessToken + '; ' + attributes.join('; '));
  res.setHeader('Cache-Control', 'no-store');
}

function clearSessionCookie(res, req) {
  setSessionCookie(res, req, '', 0);
}

function providerFailureIsTransient(error) {
  const status = Number(error && error.status);
  return !Number.isFinite(status) || status === 0 || status === 429 || status >= 500;
}

function createAuthSessionRouter({ createAuthClient, logger = console }) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'Same-origin request required' });
    const accessToken = req.body && req.body.accessToken;
    if (typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 8192) {
      return res.status(400).json({ error: 'A valid access token is required' });
    }

    const expiry = accessTokenExpiry(accessToken);
    if (!expiry || expiry <= Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    try {
      const result = await createAuthClient().auth.getUser(accessToken);
      if (result.error) {
        if (providerFailureIsTransient(result.error)) {
          logger.error('Session-cookie verification temporarily unavailable');
          return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
        }
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }
      if (!result.data || !result.data.user) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      const remaining = Math.min(24 * 60 * 60, expiry - Math.floor(Date.now() / 1000));
      if (remaining <= 0) return res.status(401).json({ error: 'Invalid or expired access token' });
      setSessionCookie(res, req, accessToken, remaining);
      return res.status(204).end();
    } catch (error) {
      logger.error('Session-cookie verification temporarily unavailable:', error && error.status ? error.status : 'network error');
      return res.status(503).json({ error: 'Authentication is temporarily unavailable' });
    }
  });

  router.delete('/', (req, res) => {
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'Same-origin request required' });
    clearSessionCookie(res, req);
    return res.status(204).end();
  });

  return router;
}

function createRequirePageAuthentication({ createAuthClient, isAdmin, logger = console }) {
  return async function requirePageAuthentication(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    let url;
    try {
      url = new URL(req.originalUrl || req.url, 'http://careerpath.local');
    } catch (_error) {
      return next();
    }

    let pathname;
    try {
      // Match Express static's decoded URL path, not only the raw spelling.
      // Otherwise an encoded suffix (for example %2e in ".") can bypass the gate.
      const decodedPath = decodeURIComponent(url.pathname).replace(/\\/g, '/');
      if (decodedPath.split('/').some(part => part === '.' || part === '..')) {
        return res.status(400).type('text/plain').send('Invalid page path.');
      }
      pathname = decodedPath.toLowerCase().replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    } catch (_error) {
      return res.status(400).type('text/plain').send('Invalid page path.');
    }
    if (!PROTECTED_PAGE_PATHS.has(pathname)) return next();

    // Public certificate verification links stay public; private views require login.
    if (pathname === '/certificate.html' && url.searchParams.has('verify')) return next();

    const login = () => res.redirect(302, '/login.html?authRequired=1&next=' + encodeURIComponent(req.originalUrl || pathname));
    const failClosed = () => res.status(503).type('text/plain')
      .send('Sign-in is temporarily unavailable. Please try again.');
    const accessToken = readCookie(req);
    if (!accessToken) return login();

    let authResult;
    try {
      authResult = await createAuthClient().auth.getUser(accessToken);
    } catch (error) {
      logger.error('Protected-page authentication temporarily unavailable:', error && error.status ? error.status : 'network error');
      return failClosed();
    }

    if (authResult.error) {
      if (providerFailureIsTransient(authResult.error)) {
        logger.error('Protected-page authentication temporarily unavailable');
        return failClosed();
      }
      return login();
    }

    const user = authResult.data && authResult.data.user;
    if (!user || !user.id) return login();

    if (pathname === '/admin.html' || pathname === '/admin') {
      if (typeof isAdmin !== 'function') return failClosed();
      try {
        if (!(await isAdmin(user.id))) {
          return res.status(403).type('text/plain').send('Administrator access is required.');
        }
      } catch (error) {
        logger.error('Administrator authorization temporarily unavailable:', error && error.code ? error.code : 'database error');
        return failClosed();
      }
    }

    req.pageAuthUser = user;
    res.locals.privatePageAuth = true;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Cookie');
    return next();
  };
}

module.exports = {
  AUTH_COOKIE_NAME,
  PROTECTED_PAGE_PATHS,
  accessTokenExpiry,
  createAuthSessionRouter,
  createRequirePageAuthentication,
  isSameOrigin,
  readCookie
};
