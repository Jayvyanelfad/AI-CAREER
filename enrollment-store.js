// A unique constraint can reject a concurrent duplicate after both requests
// completed the normal pre-insert check. Confirm the resulting row belongs to
// this learner/course pair before treating that expected race as a duplicate.
async function recoverConcurrentEnrollment(supabase, { userId, courseId, insertError }) {
  if (!insertError || insertError.code !== '23505') return { recovered: false, error: null };
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (error) return { recovered: false, error };
  return { recovered: Boolean(data), error: null };
}

module.exports = { recoverConcurrentEnrollment };
