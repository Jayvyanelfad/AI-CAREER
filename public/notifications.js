// Dashboard notification centre. Persisted notification text is rendered only
// through textContent; it is never injected as HTML.
(function () {
  const list = document.getElementById('notifications-list');
  const status = document.getElementById('notifications-status');
  const markAll = document.getElementById('notifications-mark-all');
  if (!list || !status || !markAll) return;
  const label = (key, fallback) => window.t ? window.t(key, fallback) : fallback;
  const api = `${window.API_BASE || '/api'}/notifications`;
  async function headers() {
    const token = window.getAuthAccessToken ? await window.getAuthAccessToken() : localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : null;
  }
  function safeHref(value) { return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null; }
  function render(items) {
    list.replaceChildren(); markAll.hidden = !items.some(item => !item.readAt);
    if (!items.length) { const empty = document.createElement('p'); empty.className = 'notifications-empty'; empty.textContent = label('notifications.empty', 'You have no notifications yet.'); list.appendChild(empty); return; }
    items.forEach(item => {
      const article = document.createElement('article'); article.className = `notification-item${item.readAt ? '' : ' is-unread'}`;
      const heading = document.createElement('h3'); heading.textContent = item.title || label('notifications.update', 'Update'); article.appendChild(heading);
      if (item.body) { const body = document.createElement('p'); body.textContent = item.body; article.appendChild(body); }
      const footer = document.createElement('div'); footer.className = 'notification-actions';
      if (item.createdAt) { const time = document.createElement('time'); time.dateTime = item.createdAt; time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.createdAt)); footer.appendChild(time); }
      const href = safeHref(item.href);
      if (href) { const link = document.createElement('a'); link.href = href; link.textContent = label('notifications.open', 'Open'); link.addEventListener('click', () => markRead(item.id)); footer.appendChild(link); }
      if (!item.readAt) { const read = document.createElement('button'); read.type = 'button'; read.textContent = label('notifications.markRead', 'Mark as read'); read.addEventListener('click', () => markRead(item.id)); footer.appendChild(read); }
      article.appendChild(footer); list.appendChild(article);
    });
  }
  let inflight = null;
  async function load() {
    if (inflight) return inflight;
    inflight = doLoad().finally(() => { inflight = null; });
    return inflight;
  }
  async function doLoad() {
    const auth = await headers(); if (!auth) return;
    status.textContent = label('notifications.loading', 'Loading notifications…');
    try { const response = await fetch(api, { headers: auth }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'unavailable'); render(Array.isArray(payload.notifications) ? payload.notifications : []); status.textContent = ''; }
    catch (_error) { list.replaceChildren(); markAll.hidden = true; status.textContent = label('notifications.unavailable', 'Notifications are temporarily unavailable.'); }
  }
  async function markRead(id) { const auth = await headers(); if (!auth) return; await fetch(`${api}/${encodeURIComponent(id)}/read`, { method: 'POST', headers: auth }); load(); }
  markAll.addEventListener('click', async () => { const auth = await headers(); if (!auth) return; markAll.disabled = true; try { await fetch(`${api}/read-all`, { method: 'POST', headers: auth }); } finally { markAll.disabled = false; } load(); });
  document.addEventListener('careerpath:language-change', load);
  window.careerPathAuthReady?.then(load);
})();
