// Persist a completion without treating a simultaneous identical request as a
// failure. lesson_progress already has a unique (user_id, lesson_id) key.
async function persistLessonCompletion(supabase, { userId, lessonId, completedAt }) {
  const { data: existingRow, error: existingError } = await supabase
    .from('lesson_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (existingError) return { error: existingError, operation: 'read' };

  const completion = { completed: true, completed_at: completedAt, updated_at: completedAt };
  if (existingRow) {
    const { error } = await supabase
      .from('lesson_progress')
      .update(completion)
      .eq('id', existingRow.id);
    return { error, operation: 'update' };
  }

  const { error: insertError } = await supabase
    .from('lesson_progress')
    .insert({ user_id: userId, lesson_id: lessonId, completed: true, completed_at: completedAt });
  if (!insertError) return { error: null, operation: 'insert' };
  if (insertError.code !== '23505') return { error: insertError, operation: 'insert' };

  // Another request created the unique row after this request checked. Mark
  // that row completed and continue with the normal derived-progress flow.
  const { error } = await supabase
    .from('lesson_progress')
    .update(completion)
    .eq('user_id', userId)
    .eq('lesson_id', lessonId);
  return { error, operation: 'concurrent-update' };
}

module.exports = { persistLessonCompletion };
