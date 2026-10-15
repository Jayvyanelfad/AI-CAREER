const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'public', name), 'utf8');

test('enrollment modal never throws on missing nodes and shows a prompt', () => {
  const js = read('courses.js');
  const html = read('courses.html');
  // The missing #modal-course-name node is gone entirely: the visible prompt
  // carries the localized confirm question, with feedback + confirm guards.
  assert.doesNotMatch(js, /modalCourseName/);
  // The visible prompt carries the localized confirm question; the feedback
  // node and confirm button are guarded so a missing node can never throw.
  assert.match(js, /getElementById\('modal-enroll-prompt'\)/);
  assert.match(js, /coverage\.confirmEnrollPrompt/);
  assert.match(js, /getElementById\('enrollment-feedback'\)/);
  assert.match(html, /id="modal-enroll-prompt"/);
  assert.match(html, /id="enrollment-feedback"/);
  // Containers and buttons are null-guarded before listeners attach.
  assert.match(js, /if \(!freeCoursesContainer\)/);
  assert.match(js, /if \(!courseCard\) return/);
  assert.match(js, /if \(confirmEnroll\)/);
});

test('assessment CTA points at the assessment, not registration', () => {
  const html = read('courses.html');
  assert.match(html, /href="career-test\.html"[^>]*>\s*<i[^>]*><\/i>\s*Take the Career Assessment/);
  assert.doesNotMatch(html, /href="register\.html"[^>]*>[\s\S]{0,120}Take the Career Assessment/);
});

test('contact form is honest about having no backend endpoint', () => {
  const html = read('contactus.html');
  assert.doesNotMatch(html, /Message sent successfully/);
  assert.doesNotMatch(html, /setTimeout\(\(\) => \{\s*document\.getElementById\('contact-success'\)/);
  assert.match(html, /mailto:support@aicareer\.com/);
  assert.match(html, /Nothing is sent until you press Send there/);
  assert.match(html, /id="contact-success"[^>]*role="status"/);
});

test('exam logout is a real button, not a javascript: pseudo-link', () => {
  const html = read('exam.html');
  assert.doesNotMatch(html, /javascript:void\(0\)/);
  assert.match(html, /<button type="button"[^>]*data-logout[^>]*>[\s\S]*?Logout/);
  const nav = fs.readFileSync(path.join(__dirname, '..', 'public', 'auth-navigation.js'), 'utf8');
  assert.match(nav, /closest\('\[data-logout\]'\)/);
});

test('public certificate verification bypasses the auth gate', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const nav = fs.readFileSync(path.join(__dirname, '..', 'public', 'auth-navigation.js'), 'utf8');
  // certificate.html stays protected by default ...
  assert.match(nav, /'certificate\.html'/);
  // ... but ?verify= links remain publicly reachable.
  assert.match(nav, /isPublicCertificateVerification/);
  assert.match(nav, /URLSearchParams\(window\.location\.search\)\.has\('verify'\)/);
  // The certificate page itself supports the public path without a token.
  const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'certificate.js'), 'utf8');
  assert.match(page, /\/api\/certificate\/verify\//);
});

test('about anchors resolve to a real section', () => {
  const index = read('index.html');
  assert.match(index, /id="about"/);
  for (const page of ['courses.html', 'course-detail.html']) {
    assert.match(read(page), /href="index\.html#about"/);
  }
});

test('chatbot controls are named, live, and closable', () => {
  const html = read('chatbot.html');
  const js = read('chatbot.js');
  assert.match(html, /id="chat-input"[^>]*aria-label="Type your message"/);
  assert.match(html, /id="send-message"[^>]*aria-label="Send message"/);
  assert.match(html, /id="chatbot-close-btn"[^>]*aria-label="Close chat"/);
  assert.match(html, /id="chatbot-body"[^>]*role="log"[^>]*aria-live="polite"/);
  assert.match(html, /<button class="floating-chatbot" id="floating-chatbot"[^>]*>/);
  assert.match(js, /getElementById\("chatbot-close-btn"\)/);
  assert.match(js, /getElementById\("floating-chatbot"\)/);
  // The floating widget must not duplicate the dedicated page's static window.
  assert.match(js, /if \(document\.getElementById\("chatbot-window"\)\) return;/);
  // Offline fallback: deterministic navigation help from verified routes only.
  assert.match(js, /guideReply\(message\)/);
  assert.match(js, /coverage\.chatbotGuidePrefix/);
  assert.doesNotMatch(js, /['"]admin\.html['"]/);
  assert.match(js, /aria-label="Type your message"/);
  assert.match(js, /aria-label="Send message"/);
  assert.match(js, /role="log" aria-live="polite"/);
});

test('dashboard grids ship loading states and the floating chat link works', () => {
  const html = read('dashboard.html');
  for (const id of ['career-summary', 'courses-grid', 'explore-grid', 'certificates-grid']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-busy="true">[\\s\\S]*?loading-copy`));
  }
  assert.match(html, /<a class="floating-chatbot" id="floating-chatbot" href="chatbot\.html" aria-label=/);
});

test('admin shortcut is hidden until the server confirms membership', () => {
  const html = read('dashboard.html');
  const js = read('dashboard.js');
  assert.match(html, /id="admin-shortcut"[^>]*hidden/);
  assert.match(html, /href="admin\.html"/);
  // Fail-closed: revealed only on an ok response, never on error.
  assert.match(js, /\/admin\/overview/);
  assert.match(js, /if \(adminCheck && adminCheck\.ok\)/);
  assert.match(js, /adminShortcut\.hidden = false/);
  assert.match(js, /direct URL|reachable by direct URL/);
});

test('server fails fast on missing env and reports config without secrets', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.ok(server.includes("const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];"));
  assert.ok(server.includes('!process.env.SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_ANON_KEY'));
  assert.match(server, /Missing required environment variables/);
  assert.match(server, /process\.exit\(1\)/);
  assert.match(server, /configured: \{\s*gemini: Boolean\(process\.env\.GEMINI_API_KEY\)/);
  assert.match(server, /programmingExecution: Boolean\(process\.env\.PROGRAMMING_EXECUTION_PROVIDER/);
  // The health payload reports booleans only: no secret value may be
  // interpolated or returned anywhere in the health route.
  const healthBlock = server.slice(server.indexOf("app.get('/api/health'"), server.indexOf('// Get all questions'));
  assert.match(healthBlock, /Boolean\(process\.env\./);
  assert.doesNotMatch(healthBlock, /\$\{process\.env\./);
  assert.ok(!/apiKey:\s*process\.env/.test(healthBlock) && !/process\.env\.[A-Z_]+\s*[,}]/.test(healthBlock.replace(/Boolean\(process\.env\.[A-Z_]+\)/g, '')), 'health must not return raw env values');
});

test('course page prefers the flagged final and explains a missing one', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const detail = fs.readFileSync(path.join(__dirname, '..', 'public', 'course-detail.js'), 'utf8');
  // Never present a section quiz as the final exam.
  assert.doesNotMatch(detail, /currentExam = finalExam \|\| data\.exams\[0\]/);
  assert.match(detail, /data\.exams\.find\(exam => exam\.is_final === true\)/);
  assert.match(detail, /examNotConfigured/);
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /is_final: exam\.is_final === true/);
  assert.match(server, /duration_minutes, is_final'\)/);
});
