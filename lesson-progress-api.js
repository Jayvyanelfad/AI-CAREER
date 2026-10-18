// Lesson progress API for marking lessons as incomplete
const express = require('express');

function createLessonProgressRouter({ supabase, authenticateToken, courseLearningStore }) {
  const router = express.Router();

  router.post('/:lessonId/incomplete', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const lessonId = req.params.lessonId;
      if (!isUuid(lessonId)) return res.status(400).json({ error: 'Invalid lesson id' });

      const { data: lesson, error: lessonError } = await supabase
        .from('lessons').select('id, module_id').eq('id', lessonId).maybeSingle();
      if (lessonError) {
        console.error('Error fetching lesson for uncompletion:', lessonError);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

      const { data: module, error: moduleError } = await supabase
        .from('modules').select('id, course_id').eq('id', lesson.module_id).maybeSingle();
      if (moduleError) {
        console.error('Error fetching module for uncompletion:', moduleError);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!module) return res.status(404).json({ error: 'Module not found for lesson' });

      const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments').select('id')
        .eq('user_id', userId).eq('course_id', module.course_id).maybeSingle();
      if (enrollError) {
        console.error('Error fetching enrollment for uncompletion:', enrollError);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });

      const { error: progressError } = await supabase
        .from('lesson_progress')
        .update({ completed: false, completed_at: null })
        .eq('user_id', userId).eq('lesson_id', lessonId);
      if (progressError) {
        console.error('Error marking lesson incomplete:', progressError);
        return res.status(500).json({ error: 'Failed to update lesson progress' });
      }

      const summary = await courseLearningStore.getProgressSummary(userId, module.course_id);
      const { error: enrollmentUpdateError } = await supabase
        .from('enrollments')
        .update({
          progress: summary.progress,
          completed_hours: summary.completedHours,
          next_lesson_title: summary.nextLessonTitle
        })
        .eq('id', enrollment.id);
      if (enrollmentUpdateError) {
        console.error('Error recalculating enrollment progress:', enrollmentUpdateError);
        return res.status(500).json({ error: 'Failed to update course progress' });
      }

      return res.json({
        lessonId,
        completed: false,
        completedLessons: summary.completedLessons,
        totalLessons: summary.totalLessons,
        progress: summary.progress,
        completedLessonIds: summary.completedLessonIds
      });
    } catch (error) {
      console.error('Lesson uncompletion error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Helper function to validate UUID
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value);
  }

  return router;
}

module.exports = { createLessonProgressRouter };