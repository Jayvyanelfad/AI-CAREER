const express = require('express');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseProgressUpdate(body) {
  const { enrollmentId, progress, completedHours } = body || {};
  if (enrollmentId === undefined || progress === undefined) {
    return { error: 'Enrollment ID and progress are required' };
  }
  if (typeof enrollmentId !== 'string' || !UUID_RE.test(enrollmentId)) {
    return { error: 'Enrollment ID must be a valid UUID' };
  }
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    return { error: 'Progress must be an integer from 0 to 100' };
  }
  const normalizedCompletedHours = completedHours === undefined || completedHours === null ? 0 : completedHours;
  if (!Number.isSafeInteger(normalizedCompletedHours) || normalizedCompletedHours < 0) {
    return { error: 'Completed hours must be a non-negative integer' };
  }
  return { value: { enrollmentId, progress, completedHours: normalizedCompletedHours } };
}

// Legacy clients still use this endpoint. Keep its request and response shape,
// but use the snake_case enrollment schema used by the active learning routes.
function createProgressRouter({ supabase, authenticateToken, logger = console } = {}) {
  const router = express.Router();

  router.post('/', authenticateToken, async (req, res) => {
    try {
      const parsed = parseProgressUpdate(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const { enrollmentId, progress, completedHours } = parsed.value;

      const { error: updateError } = await supabase
        .from('enrollments')
        .update({
          progress,
          completed_hours: completedHours || 0
        })
        .eq('id', enrollmentId)
        .eq('user_id', req.user.id);

      if (updateError) {
        logger.error('Error updating progress:', updateError);
        return res.status(500).json({ error: 'Failed to update progress' });
      }

      const { count, error: lookupError } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact' })
        .eq('id', enrollmentId)
        .eq('user_id', req.user.id);

      if (lookupError) {
        logger.error('Error checking enrollment progress update:', lookupError);
        return res.status(500).json({ error: 'Failed to update progress' });
      }
      if (count === 0) return res.status(404).json({ error: 'Enrollment not found' });

      return res.json({ message: 'Progress updated successfully' });
    } catch (error) {
      logger.error('Progress error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createProgressRouter, parseProgressUpdate };
