function createCourseLearningStore(supabase) {
  async function getCourseLessons(courseId) {
    const { data: modules, error: moduleError } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);

    if (moduleError) throw moduleError;
    if (!modules?.length) return [];

    const { data: lessons, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, lesson_order, duration_minutes')
      .in('module_id', modules.map(module => module.id))
      .order('lesson_order', { ascending: true });

    if (lessonError) throw lessonError;
    return lessons || [];
  }

  async function getProgressSummary(userId, courseId) {
    const lessons = await getCourseLessons(courseId);
    const lessonIds = lessons.map(lesson => lesson.id);
    if (!lessonIds.length) {
      return {
        completedLessonIds: [],
        totalLessons: 0,
        completedLessons: 0,
        progress: 0,
        completedHours: 0,
        nextLessonTitle: null
      };
    }

    const { data: progressRows, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', lessonIds);

    if (progressError) throw progressError;

    const lessonIdSet = new Set(lessonIds);
    const completedLessonIds = [...new Set((progressRows || [])
      .map(row => row.lesson_id)
      .filter(lessonId => lessonIdSet.has(lessonId)))];
    const completedIdSet = new Set(completedLessonIds);
    const completedLessons = completedIdSet.size;
    const completedMinutes = lessons
      .filter(lesson => completedIdSet.has(lesson.id))
      .reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0);
    const nextLesson = lessons.find(lesson => !completedIdSet.has(lesson.id));

    return {
      completedLessonIds,
      totalLessons: lessons.length,
      completedLessons,
      progress: Math.round((completedLessons / lessons.length) * 100),
      completedHours: Math.round(completedMinutes / 60),
      nextLessonTitle: nextLesson ? nextLesson.title : null
    };
  }

  return { getCourseLessons, getProgressSummary };
}

module.exports = { createCourseLearningStore };
