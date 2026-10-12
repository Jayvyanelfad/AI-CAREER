// User-scoped persistent notification API. All reads and mutations include the
// authenticated user's id, even though the database migration also enforces
// ownership with RLS.
const express = require('express');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asNotification(row) {
  return { id: row.id, type: row.type, title: row.title, body: row.body, href: row.href || null, readAt: row.read_at || null, createdAt: row.created_at };
}

// Event producers use this helper rather than accepting notification content
// from the browser. The unique (user_id, dedupe_key) constraint makes retries
// and concurrent completion requests idempotent.
async function createNotification(supabase, { userId, type, title, body, href, dedupeKey }) {
  if (!supabase || !userId || !type || !title || !dedupeKey) return false;
  const { error } = await supabase.from('notifications').upsert({
    user_id: userId, type, title, body: body || null, href: href || null, dedupe_key: dedupeKey
  }, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true });
  if (error) throw error;
  return true;
}

function createNotificationRouter({ supabase, authenticateToken, logger = console } = {}) {
  const router = express.Router();
  router.get('/', authenticateToken, async (req, res) => {
    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 50) : 20;
    try {
      const { data, error } = await supabase.from('notifications').select('id, type, title, body, href, read_at, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return res.json({ notifications: (data || []).map(asNotification) });
    } catch (error) {
      logger.error('Notification list error:', error.message || error);
      return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
    }
  });
  router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).is('read_at', null);
      if (error) throw error;
      return res.json({ unreadCount: count || 0 });
    } catch (error) {
      logger.error('Notification count error:', error.message || error);
      return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
    }
  });
  router.post('/:notificationId/read', authenticateToken, async (req, res) => {
    if (!UUID_RE.test(req.params.notificationId)) return res.status(400).json({ error: 'Invalid notification id.' });
    try {
      const { data, error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', req.params.notificationId).eq('user_id', req.user.id).is('read_at', null).select('id, type, title, body, href, read_at, created_at').maybeSingle();
      if (error) throw error;
      // This is idempotent; a missing result never reveals another user's row.
      return res.json({ notification: data ? asNotification(data) : null });
    } catch (error) {
      logger.error('Notification read error:', error.message || error);
      return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
    }
  });
  router.post('/read-all', authenticateToken, async (req, res) => {
    try {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', req.user.id).is('read_at', null);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      logger.error('Notification read-all error:', error.message || error);
      return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
    }
  });
  return router;
}

module.exports = { createNotificationRouter, createNotification, asNotification };
