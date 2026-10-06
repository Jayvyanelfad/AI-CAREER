const express = require('express');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === 'string' && UUID_RE.test(value);

async function certificatePresentation(supabase, certificate) {
  const { data: learner, error } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', certificate.user_id)
    .maybeSingle();
  if (error) throw error;
  if (typeof learner?.full_name !== 'string' || !learner.full_name.trim()) {
    throw new Error('Certificate owner profile has no display name');
  }
  return {
    certificateId: certificate.id,
    learnerName: learner.full_name.trim(),
    courseId: certificate.course_id,
    courseTitle: certificate.course_name,
    issuedAt: certificate.earned_at,
    status: 'issued',
    valid: true
  };
}

async function getCertificateForUser(supabase, certificateId, userId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, user_id, course_id, course_name, earned_at')
    .eq('id', certificateId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function createCertificateRouter({ supabase, authenticateToken }) {
  const router = express.Router();

  router.get('/certificate/verify/:certificateId', async (req, res) => {
    try {
      if (!isUuid(req.params.certificateId)) {
        return res.status(400).json({ valid: false, status: 'invalid_id' });
      }
      const { data: certificate, error } = await supabase
        .from('certificates')
        .select('id, user_id, course_id, course_name, earned_at')
        .eq('id', req.params.certificateId)
        .maybeSingle();
      if (error) throw error;
      if (!certificate) return res.status(404).json({ valid: false, status: 'not_found' });
      return res.json(await certificatePresentation(supabase, certificate));
    } catch (error) {
      console.error('Certificate verification error:', error);
      return res.status(500).json({ error: 'Certificate verification is unavailable' });
    }
  });

  router.get('/certificate/id/:certificateId', authenticateToken, async (req, res) => {
    try {
      if (!isUuid(req.params.certificateId)) return res.status(404).json({ error: 'Certificate not found' });
      const certificate = await getCertificateForUser(supabase, req.params.certificateId, req.user.id);
      if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
      return res.json(await certificatePresentation(supabase, certificate));
    } catch (error) {
      console.error('Certificate retrieval error:', error);
      return res.status(500).json({ error: 'Failed to load certificate' });
    }
  });

  router.get('/certificate/:courseId', authenticateToken, async (req, res) => {
    try {
      const { data: certificate, error } = await supabase
        .from('certificates')
        .select('id, user_id, course_id, course_name, earned_at')
        .eq('course_id', req.params.courseId)
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
      return res.json(await certificatePresentation(supabase, certificate));
    } catch (error) {
      console.error('Certificate retrieval error:', error);
      return res.status(500).json({ error: 'Failed to load certificate' });
    }
  });

  router.post('/certificate/:courseId/issue', authenticateToken, async (req, res) => {
    try {
      if (Object.keys(req.body || {}).length) {
        return res.status(400).json({ error: 'Certificate issuance does not accept client-provided result data' });
      }
      const userId = req.user.id;
      const courseId = req.params.courseId;

      const { data: existing, error: existingError } = await supabase
        .from('certificates')
        .select('id, user_id, course_id, course_name, earned_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        return res.json({ success: true, certificate: await certificatePresentation(supabase, existing) });
      }

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (enrollmentError) throw enrollmentError;
      if (!enrollment) return res.status(403).json({ error: 'Enroll in this course before requesting its certificate' });

      const { data: modules, error: moduleError } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId);
      if (moduleError) throw moduleError;
      const moduleIds = (modules || []).map(module => module.id);
      if (!moduleIds.length) return res.status(409).json({ error: 'The course has no required lessons' });

      const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds);
      if (lessonError) throw lessonError;
      const lessonIds = (lessons || []).map(lesson => lesson.id);
      if (!lessonIds.length) return res.status(409).json({ error: 'The course has no required lessons' });

      const { data: progress, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('lesson_id', lessonIds);
      if (progressError) throw progressError;
      const completedIds = new Set((progress || []).map(row => row.lesson_id));
      if (lessonIds.some(id => !completedIds.has(id))) {
        return res.status(409).json({ error: 'Complete every required course lesson before requesting its certificate' });
      }

      const { data: courseExams, error: examError } = await supabase
        .from('exams')
        .select('id, title')
        .eq('course_id', courseId);
      if (examError) throw examError;
      const eligibleExams = [];
      for (const candidate of courseExams || []) {
        const { count, error } = await supabase
          .from('exam_questions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', candidate.id);
        if (error) throw error;
        if (count > 0 && /\bfinal\s+exam\b/i.test(candidate.title || '')) eligibleExams.push(candidate);
      }
      if (eligibleExams.length !== 1) {
        return res.status(409).json({ error: 'A single configured final exam is required for certificate issuance' });
      }

      const { data: latestAttempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('id, submitted_at, passed, attempt_number')
        .eq('exam_id', eligibleExams[0].id)
        .eq('user_id', userId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!latestAttempt || !latestAttempt.submitted_at || latestAttempt.passed !== true) {
        return res.status(403).json({ error: 'Pass the latest submitted final exam attempt before requesting a certificate' });
      }

      const { data: learner, error: learnerError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      if (learnerError) throw learnerError;
      if (typeof learner?.full_name !== 'string' || !learner.full_name.trim()) {
        return res.status(409).json({ error: 'Add your name to your profile before requesting a certificate' });
      }

      const { data: created, error: insertError } = await supabase
        .from('certificates')
        .insert({ user_id: userId, course_id: courseId, course_name: course.title })
        .select('id, user_id, course_id, course_name, earned_at')
        .single();
      if (insertError?.code === '23505') {
        const { data: concurrentCertificate, error: concurrentError } = await supabase
          .from('certificates')
          .select('id, user_id, course_id, course_name, earned_at')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
        if (concurrentError) throw concurrentError;
        if (concurrentCertificate) {
          return res.json({ success: true, certificate: await certificatePresentation(supabase, concurrentCertificate) });
        }
      }
      if (insertError) throw insertError;
      return res.status(201).json({
        success: true,
        certificate: await certificatePresentation(supabase, created)
      });
    } catch (error) {
      console.error('Certificate issuance error:', error);
      return res.status(500).json({ error: 'Failed to issue certificate' });
    }
  });

  return router;
}

module.exports = { createCertificateRouter };
