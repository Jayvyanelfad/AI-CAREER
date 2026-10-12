const express = require('express');

function formatEnrollment(enrollment) {
  const progressAvailable = typeof enrollment.progress === 'number' && Number.isFinite(enrollment.progress);
  return {
    id: enrollment.id,
    courseId: enrollment.course_id,
    courseName: enrollment.course_name,
    progress: enrollment.progress || 0,
    progressAvailable,
    completedHours: enrollment.completed_hours || 0,
    totalHours: enrollment.total_hours || 0,
    nextLessonTitle: enrollment.next_lesson_title || 'Next lesson',
    enrolledAt: enrollment.enrolled_at
  };
}

function createCourseEnrollmentRouter({ supabase, authenticateToken }) {
  const router = express.Router();

  router.post('/enroll', authenticateToken, async (req, res) => {
    try {
      const { courseId } = req.body || {};
      const userId = req.user.id;

      if (typeof courseId !== 'string' || !courseId.trim()) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title, status')
        .eq('id', courseId)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!course) return res.status(404).json({ error: 'Course not found' });
      if (course.status === 'coming_soon') {
        return res.status(409).json({ error: 'This course is not available for enrollment yet' });
      }
      if (course.status !== 'available') {
        return res.status(409).json({ error: 'Course availability is not configured' });
      }

      const { data: existing, error: lookupError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) {
        return res.status(200).json({
          message: 'Already enrolled in this course',
          enrollment: formatEnrollment(existing)
        });
      }

      const { data: created, error: insertError } = await supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          course_id: courseId,
          course_name: course.title || courseId,
          progress: 0,
          completed_hours: 0,
          total_hours: 0
        })
        .select()
        .single();

      if (insertError?.code === '23505') {
        const { data: concurrentEnrollment, error: concurrentLookupError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
        if (concurrentLookupError) throw concurrentLookupError;
        if (concurrentEnrollment) {
          return res.status(200).json({
            message: 'Already enrolled in this course',
            enrollment: formatEnrollment(concurrentEnrollment)
          });
        }
      }
      if (insertError) throw insertError;

      return res.status(201).json({
        message: 'Successfully enrolled in course',
        enrollment: formatEnrollment(created)
      });
    } catch (error) {
      console.error('Enroll error:', error);
      return res.status(500).json({ error: 'Could not enroll in course' });
    }
  });

  router.get('/enrollments/:courseId', authenticateToken, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('course_id', req.params.courseId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'NOT_ENROLLED' });
      return res.json(formatEnrollment(data));
    } catch (error) {
      console.error('Error fetching enrollment:', error);
      return res.status(500).json({ error: 'Could not verify enrollment' });
    }
  });

  return router;
}

module.exports = { createCourseEnrollmentRouter, formatEnrollment };
