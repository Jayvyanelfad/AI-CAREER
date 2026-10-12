require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const courses = require('./modern-ai-course-content.json');
const catalog = require('./course-catalog-config.json');

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lessonContent(module, lesson) {
  const sections = [
    ['Story', module.story],
    ['Discovery', module.discovery],
    ['Learning Objective', lesson.objective],
    ['Concept', lesson.concept],
    ['Example', lesson.example],
    ['Challenge', lesson.challenge],
    ['Takeaway', lesson.takeaway]
  ];
  return sections.map(([heading, body]) =>
    `<section class="lesson-section"><h3>${heading}</h3><p>${escapeHtml(body)}</p></section>`
  ).join('\n');
}

function assertCurriculum() {
  const ids = Object.keys(courses);
  if (ids.length !== 10 || new Set(ids).size !== ids.length) {
    throw new Error(`Expected 10 unique course IDs; found ${ids.length}.`);
  }
  for (const [courseId, course] of Object.entries(courses)) {
    if (!catalog.courseCategories[courseId]) throw new Error(`${courseId} has no catalog category.`);
    if (!course.title || !course.description || !course.image || !course.badge || !course.level || !course.difficulty || !Number.isInteger(course.weeks)) {
      throw new Error(`${courseId} is missing required course metadata.`);
    }
    if (!Array.isArray(course.modules) || !course.modules.length) throw new Error(`${courseId} has no modules.`);
    for (const module of course.modules) {
      if (!module.title || !module.description || !module.story || !module.discovery || !Array.isArray(module.lessons) || !module.lessons.length) {
        throw new Error(`${courseId} contains an incomplete module.`);
      }
      for (const lesson of module.lessons) {
        for (const key of ['title', 'objective', 'concept', 'example', 'challenge', 'takeaway']) {
          if (!lesson[key]) throw new Error(`${courseId}/${module.title} contains a lesson missing ${key}.`);
        }
        if (!Number.isInteger(lesson.minutes) || lesson.minutes < 1) throw new Error(`${courseId}/${module.title}/${lesson.title} has invalid minutes.`);
      }
    }
  }
}

async function queryOrThrow(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
}

async function seed() {
  assertCurriculum();
  const ids = Object.keys(courses);

  const courseRows = ids.map((id) => {
    const course = courses[id];
    return {
      id,
      title: course.title,
      description: course.description,
      image: course.image,
      badge: course.badge,
      difficulty: course.difficulty,
      weeks: course.weeks,
      level: course.level
    };
  });

  // Insert only. Existing course rows are never updated by this seed.
  const { error: courseInsertError } = await supabase
    .from('courses')
    .upsert(courseRows, { onConflict: 'id', ignoreDuplicates: true });
  if (courseInsertError) throw new Error(`Insert modern courses: ${courseInsertError.message}`);

  const storedCourses = await queryOrThrow(
    supabase.from('courses').select('id,title,description,image,badge,difficulty,weeks,level').in('id', ids),
    'Read modern courses'
  );
  const storedById = new Map(storedCourses.map((row) => [row.id, row]));
  for (const expected of courseRows) {
    const actual = storedById.get(expected.id);
    if (!actual || actual.title !== expected.title) {
      throw new Error(`Course ${expected.id} is missing or has a conflicting title; no existing row was overwritten.`);
    }
  }

  const existingModules = await queryOrThrow(
    supabase.from('modules').select('id,course_id,title,description,module_order').in('course_id', ids),
    'Read existing modern modules'
  );
  const modulesByCourse = new Map(ids.map((id) => [id, new Map()]));
  for (const row of existingModules) {
    const byOrder = modulesByCourse.get(row.course_id);
    if (byOrder.has(row.module_order)) throw new Error(`Duplicate module order ${row.module_order} for ${row.course_id}.`);
    byOrder.set(row.module_order, row);
  }

  const missingModules = [];
  for (const [courseId, course] of Object.entries(courses)) {
    const existing = modulesByCourse.get(courseId);
    course.modules.forEach((module, index) => {
      const order = index + 1;
      const found = existing.get(order);
      if (found) {
        if (found.title !== module.title) throw new Error(`Conflicting module at ${courseId} order ${order}; existing content was left untouched.`);
      } else {
        missingModules.push({ course_id: courseId, title: module.title, description: module.description, module_order: order });
      }
    });
  }
  if (missingModules.length) {
    const { error } = await supabase.from('modules').insert(missingModules);
    if (error) throw new Error(`Insert modern modules: ${error.message}`);
  }

  const allModules = await queryOrThrow(
    supabase.from('modules').select('id,course_id,title,module_order').in('course_id', ids),
    'Read seeded modern modules'
  );
  const moduleIndex = new Map();
  for (const row of allModules) {
    const key = `${row.course_id}:${row.module_order}`;
    if (moduleIndex.has(key)) throw new Error(`Duplicate module ordering found at ${key}.`);
    moduleIndex.set(key, row);
  }

  const moduleIds = allModules.map((row) => row.id);
  const existingLessons = moduleIds.length ? await queryOrThrow(
    supabase.from('lessons').select('id,module_id,title,lesson_order,content,duration_minutes').in('module_id', moduleIds),
    'Read existing modern lessons'
  ) : [];
  const lessonsByModule = new Map(moduleIds.map((id) => [id, new Map()]));
  for (const row of existingLessons) {
    const byOrder = lessonsByModule.get(row.module_id);
    if (byOrder.has(row.lesson_order)) throw new Error(`Duplicate lesson order ${row.lesson_order} for module ${row.module_id}.`);
    byOrder.set(row.lesson_order, row);
  }

  const missingLessons = [];
  for (const [courseId, course] of Object.entries(courses)) {
    course.modules.forEach((module, moduleIndexValue) => {
      const moduleRow = moduleIndex.get(`${courseId}:${moduleIndexValue + 1}`);
      if (!moduleRow || moduleRow.title !== module.title) throw new Error(`Module missing or conflicting at ${courseId} order ${moduleIndexValue + 1}.`);
      const existing = lessonsByModule.get(moduleRow.id);
      module.lessons.forEach((lesson, lessonIndex) => {
        const order = lessonIndex + 1;
        const content = lessonContent(module, lesson);
        const found = existing.get(order);
        if (found) {
          if (found.title !== lesson.title || found.content !== content || found.duration_minutes !== lesson.minutes) {
            throw new Error(`Conflicting lesson at ${courseId}/${module.title} order ${order}; existing content was left untouched.`);
          }
        } else {
          missingLessons.push({
            module_id: moduleRow.id,
            title: lesson.title,
            content,
            lesson_order: order,
            duration_minutes: lesson.minutes
          });
        }
      });
    });
  }
  if (missingLessons.length) {
    const { error } = await supabase.from('lessons').insert(missingLessons);
    if (error) throw new Error(`Insert modern lessons: ${error.message}`);
  }

  const finalModules = await queryOrThrow(
    supabase.from('modules').select('id,course_id,title,module_order').in('course_id', ids),
    'Verify modern modules'
  );
  const finalLessons = finalModules.length ? await queryOrThrow(
    supabase.from('lessons').select('id,module_id,title,lesson_order').in('module_id', finalModules.map((row) => row.id)),
    'Verify modern lessons'
  ) : [];
  const lessonsByModuleId = new Map(finalModules.map((row) => [row.id, []]));
  for (const row of finalLessons) lessonsByModuleId.get(row.module_id).push(row);

  const summary = [];
  for (const [courseId, course] of Object.entries(courses)) {
    const courseModules = finalModules.filter((row) => row.course_id === courseId).sort((a, b) => a.module_order - b.module_order);
    if (courseModules.length !== course.modules.length) throw new Error(`${courseId} has ${courseModules.length}/${course.modules.length} modules.`);
    courseModules.forEach((row, index) => {
      if (row.module_order !== index + 1 || row.title !== course.modules[index].title) throw new Error(`${courseId} module ordering/title verification failed.`);
      const moduleLessons = lessonsByModuleId.get(row.id).sort((a, b) => a.lesson_order - b.lesson_order);
      const expectedLessons = course.modules[index].lessons;
      if (moduleLessons.length !== expectedLessons.length) throw new Error(`${courseId}/${row.title} has ${moduleLessons.length}/${expectedLessons.length} lessons.`);
      moduleLessons.forEach((lesson, lessonIndex) => {
        if (lesson.lesson_order !== lessonIndex + 1 || lesson.title !== expectedLessons[lessonIndex].title) {
          throw new Error(`${courseId}/${row.title} lesson ordering/title verification failed.`);
        }
      });
    });
    summary.push({ id: courseId, title: course.title, category: catalog.courseCategories[courseId], modules: courseModules.length, lessons: courseModules.reduce((count, row) => count + lessonsByModuleId.get(row.id).length, 0) });
  }
  console.log(JSON.stringify({ insertedCourses: courseRows.length, insertedModules: missingModules.length, insertedLessons: missingLessons.length, courses: summary }, null, 2));
}

seed().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
