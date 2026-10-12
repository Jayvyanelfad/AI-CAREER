async function fetchLatestCareerAttempt(supabase, userId, completedOnly = false) {
  let attemptQuery = supabase
    .from('career_test_attempts')
    .select('id, top_careers, score_data, completed, created_at')
    .eq('user_id', userId);

  if (completedOnly) attemptQuery = attemptQuery.eq('completed', true);

  const { data: attempts, error } = await attemptQuery
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    const failure = new Error('Career assessment lookup failed');
    failure.code = 'CAREER_ASSESSMENT_READ_FAILED';
    failure.cause = error;
    throw failure;
  }

  return attempts?.[0] || null;
}

module.exports = { fetchLatestCareerAttempt };
